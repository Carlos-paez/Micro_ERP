<?php
// api/providers.php - Enhanced Supplier Management
session_start();
require_once 'db.php';

function isAdmin() {
    return isset($_SESSION['user_id']) && $_SESSION['role'] === 'admin';
}

function isProvider() {
    return isset($_SESSION['user_id']) && $_SESSION['role'] === 'provider';
}

function isAuthenticated() {
    return isset($_SESSION['user_id']);
}

function getJSONInput() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function sendJSON($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

$action = $_GET['action'] ?? '';
$user_id = $_SESSION['user_id'] ?? null;
$role = $_SESSION['role'] ?? null;

switch($action) {
    case 'list_suppliers':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT s.*, c.name as category_name,
                (SELECT COUNT(*) FROM provider_orders WHERE supplier_id = s.id) as total_orders,
                (SELECT COALESCE(SUM(total_amount), 0) FROM provider_orders WHERE supplier_id = s.id AND status = 'completed') as total_purchases
                FROM suppliers s
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.is_active = 1
                ORDER BY s.name");
            $suppliers = $stmt->fetchAll();
            sendJSON(['suppliers' => $suppliers]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'get_supplier':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        $id = intval($_GET['id'] ?? 0);
        try {
            $stmt = $pdo->prepare("SELECT s.*, c.name as category_name FROM suppliers s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = ?");
            $stmt->execute([$id]);
            $supplier = $stmt->fetch();
            if (!$supplier) sendJSON(['error' => 'Proveedor no encontrado'], 404);
            
            $stmt = $pdo->prepare("SELECT sp.*, p.name as product_name, p.sku FROM supplier_products sp JOIN products p ON sp.product_id = p.id WHERE sp.supplier_id = ?");
            $stmt->execute([$id]);
            $supplier['products'] = $stmt->fetchAll();
            
            sendJSON(['supplier' => $supplier]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'create_supplier':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        if (empty($data['name'])) sendJSON(['error' => 'Nombre requerido'], 400);
        
        try {
            $stmt = $pdo->prepare("INSERT INTO suppliers 
                (name, company_name, rfc_tax_id, contact_name, email, phone, mobile, address, city, state, country, postal_code, category_id, payment_terms, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['name'],
                $data['company_name'] ?? null,
                $data['rfc_tax_id'] ?? null,
                $data['contact_name'] ?? null,
                $data['email'] ?? null,
                $data['phone'] ?? null,
                $data['mobile'] ?? null,
                $data['address'] ?? null,
                $data['city'] ?? null,
                $data['state'] ?? null,
                $data['country'] ?? 'México',
                $data['postal_code'] ?? null,
                $data['category_id'] ?? null,
                $data['payment_terms'] ?? 'contado',
                $data['notes'] ?? null
            ]);
            $id = $pdo->lastInsertId();
            sendJSON(['success' => true, 'id' => $id, 'message' => 'Proveedor creado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'update_supplier':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $id = intval($data['id'] ?? 0);
        if (!$id) sendJSON(['error' => 'ID requerido'], 400);
        
        try {
            $stmt = $pdo->prepare("UPDATE suppliers SET 
                name = ?, company_name = ?, rfc_tax_id = ?, contact_name = ?, email = ?, phone = ?, mobile = ?, 
                address = ?, city = ?, state = ?, country = ?, postal_code = ?, category_id = ?, payment_terms = ?, notes = ?
                WHERE id = ?");
            $stmt->execute([
                $data['name'],
                $data['company_name'] ?? null,
                $data['rfc_tax_id'] ?? null,
                $data['contact_name'] ?? null,
                $data['email'] ?? null,
                $data['phone'] ?? null,
                $data['mobile'] ?? null,
                $data['address'] ?? null,
                $data['city'] ?? null,
                $data['state'] ?? null,
                $data['country'] ?? 'México',
                $data['postal_code'] ?? null,
                $data['category_id'] ?? null,
                $data['payment_terms'] ?? 'contado',
                $data['notes'] ?? null,
                $id
            ]);
            sendJSON(['success' => true, 'message' => 'Proveedor actualizado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'delete_supplier':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $id = intval($data['id'] ?? 0);
        if (!$id) sendJSON(['error' => 'ID requerido'], 400);
        
        try {
            $stmt = $pdo->prepare("UPDATE suppliers SET is_active = 0 WHERE id = ?");
            $stmt->execute([$id]);
            sendJSON(['success' => true, 'message' => 'Proveedor eliminado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'list_orders':
        try {
            $status = $_GET['status'] ?? '';
            $supplier_id = intval($_GET['supplier_id'] ?? 0);
            
            $sql = "SELECT po.*, s.name as supplier_name, s.contact_name, s.phone as supplier_phone,
                    u.username as created_by_name
                    FROM provider_orders po
                    JOIN suppliers s ON po.supplier_id = s.id
                    LEFT JOIN users u ON po.created_by = u.id
                    WHERE 1=1";
            $params = [];
            
            if ($status) {
                $sql .= " AND po.status = ?";
                $params[] = $status;
            }
            if ($supplier_id > 0) {
                $sql .= " AND po.supplier_id = ?";
                $params[] = $supplier_id;
            }
            
            $sql .= " ORDER BY po.created_at DESC LIMIT 100";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $orders = $stmt->fetchAll();
            
            $stmtItems = $pdo->prepare("SELECT poi.*, p.name as product_name, p.sku 
                FROM provider_order_items poi 
                JOIN products p ON poi.product_id = p.id 
                WHERE poi.order_id = ?");
            
            foreach ($orders as &$order) {
                $stmtItems->execute([$order['id']]);
                $order['items'] = $stmtItems->fetchAll();
            }
            
            sendJSON(['orders' => $orders]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'get_order':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        $id = intval($_GET['id'] ?? 0);
        try {
            $stmt = $pdo->prepare("SELECT po.*, s.name as supplier_name, s.contact_name, s.phone, s.email as supplier_email
                FROM provider_orders po
                JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.id = ?");
            $stmt->execute([$id]);
            $order = $stmt->fetch();
            if (!$order) sendJSON(['error' => 'Pedido no encontrado'], 404);
            
            $stmt = $pdo->prepare("SELECT poi.*, p.name as product_name, p.sku, p.stock as current_stock
                FROM provider_order_items poi 
                JOIN products p ON poi.product_id = p.id 
                WHERE poi.order_id = ?");
            $stmt->execute([$id]);
            $order['items'] = $stmt->fetchAll();
            
            sendJSON(['order' => $order]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'create_order':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $items = $data['items'] ?? [];
        
        if (empty($items)) sendJSON(['error' => 'No hay productos en el pedido'], 400);
        if (empty($data['supplier_id'])) sendJSON(['error' => 'Proveedor requerido'], 400);
        
        try {
            $pdo->beginTransaction();
            
            $order_number = 'PO-' . date('Ymd') . '-' . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
            
            $stmt = $pdo->prepare("INSERT INTO provider_orders 
                (order_number, supplier_id, status, order_date, expected_date, notes, created_by) 
                VALUES (?, ?, 'pending', CURDATE(), ?, ?, ?)");
            $stmt->execute([
                $order_number,
                $data['supplier_id'],
                $data['expected_date'] ?? null,
                $data['notes'] ?? null,
                $user_id
            ]);
            $order_id = $pdo->lastInsertId();
            
            $total = 0;
            $stmtItem = $pdo->prepare("INSERT INTO provider_order_items 
                (order_id, product_id, quantity_ordered, unit_price, subtotal) 
                VALUES (?, ?, ?, ?, ?)");
            
            foreach ($items as $item) {
                $product_id = intval($item['product_id']);
                $qty = intval($item['quantity']);
                $price = floatval($item['price'] ?? 0);
                $subtotal = $qty * $price;
                $total += $subtotal;
                
                $stmtItem->execute([$order_id, $product_id, $qty, $price, $subtotal]);
            }
            
            $stmt = $pdo->prepare("UPDATE provider_orders SET total_amount = ? WHERE id = ?");
            $stmt->execute([$total, $order_id]);
            
            $pdo->commit();
            sendJSON(['success' => true, 'order_id' => $order_id, 'order_number' => $order_number, 'message' => 'Pedido creado']);
        } catch (PDOException $e) {
            $pdo->rollBack();
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'update_order_status':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $order_id = intval($data['order_id'] ?? 0);
        $status = $data['status'] ?? '';
        
        if (!$order_id || !$status) sendJSON(['error' => 'Datos requeridos'], 400);
        
        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("SELECT status FROM provider_orders WHERE id = ? FOR UPDATE");
            $stmt->execute([$order_id]);
            $order = $stmt->fetch();
            if (!$order) {
                $pdo->rollBack();
                sendJSON(['error' => 'Pedido no encontrado'], 404);
            }
            
            $valid_transitions = [
                'pending' => ['sent', 'cancelled'],
                'sent' => ['confirmed', 'cancelled'],
                'confirmed' => ['in_transit', 'cancelled'],
                'in_transit' => ['received', 'partial', 'cancelled'],
                'partial' => ['completed', 'cancelled'],
            ];
            
            if (!isset($valid_transitions[$order['status']]) || !in_array($status, $valid_transitions[$order['status']])) {
                $pdo->rollBack();
                sendJSON(['error' => 'Transición de estado no válida'], 400);
            }
            
            $stmt = $pdo->prepare("UPDATE provider_orders SET status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$status, $order_id]);
            
            if ($status === 'received' || $status === 'completed') {
                $stmtItems = $pdo->prepare("SELECT * FROM provider_order_items WHERE order_id = ?");
                $stmtItems->execute([$order_id]);
                $items = $stmtItems->fetchAll();
                
                foreach ($items as $item) {
                    $stmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
                    $stmt->execute([$item['quantity_ordered'], $item['product_id']]);
                    
                    $stmt = $pdo->prepare("INSERT INTO inventory_transactions 
                        (product_id, type, quantity, stock_before, stock_after, notes, user_id) 
                        SELECT ?, 'in', ?, stock, stock + ?, ?, ?
                        FROM products WHERE id = ?");
                    $stmt->execute([
                        $item['product_id'], 
                        $item['quantity_ordered'],
                        $item['quantity_ordered'],
                        "Recepción pedido #$order_id",
                        $user_id,
                        $item['product_id']
                    ]);
                    
                    $stmt = $pdo->prepare("UPDATE provider_order_items SET status = 'fulfilled', quantity_received = quantity_ordered WHERE id = ?");
                    $stmt->execute([$item['id']]);
                }
                
                $stmt = $pdo->prepare("UPDATE provider_orders SET received_date = CURDATE() WHERE id = ?");
                $stmt->execute([$order_id]);
            }
            
            $pdo->commit();
            sendJSON(['success' => true, 'message' => "Pedido actualizado a: $status"]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'supplier_products':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $supplier_id = intval($_GET['supplier_id'] ?? 0);
        
        try {
            $stmt = $pdo->prepare("SELECT sp.*, p.name as product_name, p.sku, p.stock 
                FROM supplier_products sp 
                JOIN products p ON sp.product_id = p.id 
                WHERE sp.supplier_id = ?
                ORDER BY p.name");
            $stmt->execute([$supplier_id]);
            $products = $stmt->fetchAll();
            sendJSON(['products' => $products]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'add_supplier_product':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        
        try {
            $stmt = $pdo->prepare("INSERT INTO supplier_products 
                (supplier_id, product_id, supplier_sku, supplier_price, min_order_quantity, lead_time_days, is_preferred) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                supplier_sku = VALUES(supplier_sku), 
                supplier_price = VALUES(supplier_price),
                min_order_quantity = VALUES(min_order_quantity),
                lead_time_days = VALUES(lead_time_days),
                is_preferred = VALUES(is_preferred)");
            $stmt->execute([
                $data['supplier_id'],
                $data['product_id'],
                $data['supplier_sku'] ?? null,
                $data['supplier_price'] ?? 0,
                $data['min_order_quantity'] ?? 1,
                $data['lead_time_days'] ?? 7,
                $data['is_preferred'] ?? 0
            ]);
            sendJSON(['success' => true, 'message' => 'Producto agregado al proveedor']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'low_stock':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT p.*, c.name as category_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                WHERE p.is_active = 1 AND p.stock <= p.min_stock 
                ORDER BY p.stock ASC");
            $products = $stmt->fetchAll();
            sendJSON(['products' => $products, 'count' => count($products)]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'list_providers':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT id, username, full_name, email FROM users WHERE role = 'provider' ORDER BY username");
            $providers = $stmt->fetchAll();
            sendJSON(['providers' => $providers]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'list_products':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT id, sku, name, stock, price FROM products WHERE is_active = 1 ORDER BY name");
            $products = $stmt->fetchAll();
            sendJSON(['products' => $products]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    default:
        sendJSON(['error' => 'Acción no válida'], 400);
}
?>
