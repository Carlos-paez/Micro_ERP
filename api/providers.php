<?php
// api/providers.php
session_start();
require_once 'db.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    sendJSON(['error' => 'Unauthorized'], 401);
}

$userId = $_SESSION['user_id'];
$role = $_SESSION['role'];
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list_suppliers') {
        $stmt = $pdo->query('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC');
        sendJSON(['suppliers' => $stmt->fetchAll()]);
    
    } elseif ($action === 'list_orders') {
        $query = 'SELECT po.*, s.name as supplier_name, s.phone as supplier_phone,
                  u_created.username as created_by_name,
                  u_confirmed.username as confirmed_by_name,
                  u_received.username as received_by_name
                  FROM provider_orders po
                  JOIN suppliers s ON po.supplier_id = s.id
                  LEFT JOIN users u_created ON po.created_by = u_created.id
                  LEFT JOIN users u_confirmed ON po.confirmed_by = u_confirmed.id
                  LEFT JOIN users u_received ON po.received_by = u_received.id';
        $params = [];
        
        $statusFilter = $_GET['status'] ?? '';
        if ($statusFilter) {
            $query .= ' WHERE po.status = ?';
            $params[] = $statusFilter;
        }
        
        $query .= ' ORDER BY po.created_at DESC';
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        foreach ($orders as &$order) {
            $stmtItems = $pdo->prepare('
                SELECT poi.*, p.name as product_name, p.sku
                FROM provider_order_items poi
                JOIN products p ON poi.product_id = p.id
                WHERE poi.order_id = ?
            ');
            $stmtItems->execute([$order['id']]);
            $order['items'] = $stmtItems->fetchAll();
        }

        sendJSON(['orders' => $orders]);
    
    } elseif ($action === 'get_order') {
        $orderId = $_GET['id'] ?? 0;
        $stmt = $pdo->prepare('SELECT po.*, s.name as supplier_name FROM provider_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?');
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        
        if (!$order) {
            sendJSON(['error' => 'Order not found'], 404);
        }
        
        $stmtItems = $pdo->prepare('
            SELECT poi.*, p.name as product_name, p.sku
            FROM provider_order_items poi
            JOIN products p ON poi.product_id = p.id
            WHERE poi.order_id = ?
        ');
        $stmtItems->execute([$orderId]);
        $order['items'] = $stmtItems->fetchAll();
        
        sendJSON(['order' => $order]);
    
    } elseif ($action === 'low_stock') {
        $stmt = $pdo->query('SELECT id, name, sku, stock, min_stock FROM products WHERE stock < min_stock AND is_active = 1 ORDER BY stock ASC');
        sendJSON(['products' => $stmt->fetchAll()]);
    
    } elseif ($action === 'list_products') {
        $stmt = $pdo->query('SELECT id, name, sku, stock, price FROM products WHERE is_active = 1 ORDER BY name ASC');
        sendJSON(['products' => $stmt->fetchAll()]);
    
    } elseif ($action === 'supplier_products') {
        $supplierId = $_GET['supplier_id'] ?? 0;
        $stmt = $pdo->prepare('
            SELECT sp.*, p.name as product_name, p.sku, p.stock
            FROM supplier_products sp
            JOIN products p ON sp.product_id = p.id
            WHERE sp.supplier_id = ?
            ORDER BY p.name ASC
        ');
        $stmt->execute([$supplierId]);
        sendJSON(['supplier_products' => $stmt->fetchAll()]);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJSONInput();

    if ($action === 'create_order') {
        $supplierId = $input['supplier_id'] ?? 0;
        $items = $input['items'] ?? [];
        $notes = $input['notes'] ?? '';
        $expectedDate = $input['expected_date'] ?? null;

        if (!$supplierId) {
            sendJSON(['error' => 'Supplier is required'], 400);
        }
        if (empty($items)) {
            sendJSON(['error' => 'No items provided'], 400);
        }

        $pdo->beginTransaction();
        try {
            $orderNumber = 'PO-' . date('Ymd') . '-' . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
            
            $stmt = $pdo->prepare('INSERT INTO provider_orders (order_number, supplier_id, status, order_date, expected_date, notes, created_by) VALUES (?, ?, ?, CURDATE(), ?, ?, ?)');
            $stmt->execute([$orderNumber, $supplierId, 'draft', $expectedDate, $notes, $userId]);
            $orderId = $pdo->lastInsertId();

            $stmtItem = $pdo->prepare('INSERT INTO provider_order_items (order_id, product_id, quantity_ordered, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)');
            
            $total = 0;
            foreach ($items as $item) {
                $productId = $item['product_id'];
                $qty = $item['quantity'];
                
                $stmtProd = $pdo->prepare('SELECT cost_price FROM products WHERE id = ?');
                $stmtProd->execute([$productId]);
                $product = $stmtProd->fetch();
                
                if (!$product) continue;
                
                $unitPrice = $product['cost_price'];
                $subtotal = $qty * $unitPrice;
                $total += $subtotal;
                
                $stmtItem->execute([$orderId, $productId, $qty, $unitPrice, $subtotal]);
            }

            $stmtUpdateTotal = $pdo->prepare('UPDATE provider_orders SET total_amount = ?, subtotal = ? WHERE id = ?');
            $stmtUpdateTotal->execute([$total, $total, $orderId]);
            
            $pdo->commit();
            sendJSON(['success' => true, 'order_id' => $orderId, 'order_number' => $orderNumber]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendJSON(['error' => 'Failed creating order: ' . $e->getMessage()], 500);
        }

    } elseif ($action === 'update_order_status') {
        $orderId = $input['order_id'] ?? 0;
        $status = $input['status'] ?? '';

        $validTransitions = [
            'draft' => ['pending', 'cancelled'],
            'pending' => ['confirmed', 'cancelled'],
            'confirmed' => ['in_transit', 'cancelled'],
            'in_transit' => ['received', 'partial'],
            'received' => ['partial', 'completed'],
        ];

        $stmtGet = $pdo->prepare('SELECT status, supplier_id FROM provider_orders WHERE id = ?');
        $stmtGet->execute([$orderId]);
        $order = $stmtGet->fetch();

        if (!$order) {
            sendJSON(['error' => 'Order not found'], 404);
        }

        $allowedStatuses = $validTransitions[$order['status']] ?? [];
        if (!in_array($status, $allowedStatuses)) {
            sendJSON(['error' => 'Invalid status transition'], 400);
        }

        $pdo->beginTransaction();
        try {
            $updateFields = ['status = ?'];
            $updateParams = [$status];

            if ($status === 'pending') {
                $updateFields[] = 'confirmed_by = ?';
                $updateParams[] = $userId;
            } elseif ($status === 'received') {
                $updateFields[] = 'received_by = ?';
                $updateFields[] = 'received_date = CURDATE()';
                $updateParams[] = $userId;
            } elseif ($status === 'completed') {
                $updateFields[] = 'payment_status = ?';
                $updateParams[] = 'paid';
            }

            $updateParams[] = $orderId;
            $stmt = $pdo->prepare('UPDATE provider_orders SET ' . implode(', ', $updateFields) . ' WHERE id = ?');
            $stmt->execute($updateParams);

            if (in_array($status, ['received', 'partial', 'completed'])) {
                $stmtItems = $pdo->prepare('SELECT product_id, quantity_received, quantity_ordered FROM provider_order_items WHERE order_id = ?');
                $stmtItems->execute([$orderId]);
                $items = $stmtItems->fetchAll();

                $stmtUpdateStock = $pdo->prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
                $stmtInsertTrans = $pdo->prepare('INSERT INTO inventory_transactions (product_id, type, quantity, stock_before, stock_after, reference_type, reference_id, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

                foreach ($items as $item) {
                    $qtyToAdd = $status === 'partial' ? $item['quantity_received'] : $item['quantity_ordered'];
                    if ($qtyToAdd > 0) {
                        $stmtGetStock = $pdo->prepare('SELECT stock FROM products WHERE id = ?');
                        $stmtGetStock->execute([$item['product_id']]);
                        $stockBefore = $stmtGetStock->fetchColumn();

                        $stmtUpdateStock->execute([$qtyToAdd, $item['product_id']]);
                        $stockAfter = $stockBefore + $qtyToAdd;

                        $stmtInsertTrans->execute([
                            $item['product_id'], 'in', $qtyToAdd, $stockBefore, $stockAfter,
                            'provider_order', $orderId, "Recibido orden #$orderId", $userId
                        ]);
                    }
                }
            }

            $pdo->commit();
            sendJSON(['success' => true]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendJSON(['error' => 'Update failed: ' . $e->getMessage()], 500);
        }

    } elseif ($action === 'update_order_item') {
        $orderId = $input['order_id'] ?? 0;
        $itemId = $input['item_id'] ?? 0;
        $quantityReceived = $input['quantity_received'] ?? 0;

        $stmt = $pdo->prepare('UPDATE provider_order_items SET quantity_received = ?, status = ? WHERE id = ? AND order_id = ?');
        $status = $quantityReceived >= $input['quantity_ordered'] ? 'fulfilled' : 'partial';
        $stmt->execute([$quantityReceived, $status, $itemId, $orderId]);

        sendJSON(['success' => true]);

    } elseif ($action === 'save_supplier') {
        $id = $input['id'] ?? null;
        $data = [
            'name' => $input['name'] ?? '',
            'company_name' => $input['company_name'] ?? '',
            'rfc_tax_id' => $input['rfc_tax_id'] ?? '',
            'contact_name' => $input['contact_name'] ?? '',
            'email' => $input['email'] ?? '',
            'phone' => $input['phone'] ?? '',
            'mobile' => $input['mobile'] ?? '',
            'address' => $input['address'] ?? '',
            'city' => $input['city'] ?? '',
            'state' => $input['state'] ?? '',
            'country' => $input['country'] ?? 'México',
            'postal_code' => $input['postal_code'] ?? '',
            'payment_terms' => $input['payment_terms'] ?? 'contado',
            'notes' => $input['notes'] ?? ''
        ];

        if (empty($data['name'])) {
            sendJSON(['error' => 'Supplier name is required'], 400);
        }

        try {
            if ($id) {
                $fields = [];
                $params = [];
                foreach ($data as $key => $value) {
                    $fields[] = "$key = ?";
                    $params[] = $value;
                }
                $params[] = $id;
                $stmt = $pdo->prepare('UPDATE suppliers SET ' . implode(', ', $fields) . ' WHERE id = ?');
                $stmt->execute($params);
                sendJSON(['success' => true, 'id' => $id]);
            } else {
                $columns = array_keys($data);
                $placeholders = array_fill(0, count($data), '?');
                $stmt = $pdo->prepare('INSERT INTO suppliers (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')');
                $stmt->execute(array_values($data));
                sendJSON(['success' => true, 'id' => $pdo->lastInsertId()]);
            }
        } catch (\Exception $e) {
            sendJSON(['error' => 'Failed to save supplier'], 500);
        }

    } elseif ($action === 'delete_supplier') {
        $id = $input['id'] ?? 0;
        $stmt = $pdo->prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?');
        $stmt->execute([$id]);
        sendJSON(['success' => true]);
    }
}

sendJSON(['error' => 'Invalid action'], 400);
?>
