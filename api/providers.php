<?php
// api/providers.php
session_start();
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    sendJSON(['error' => 'Unauthorized'], 401);
}

$userId = $_SESSION['user_id'];
$role = $_SESSION['role']; // 'admin' or 'provider'
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list_orders') {
        // Providers see their own orders, Admins see all
        $query = 'SELECT po.id, po.status, po.notes, po.created_at, u.username as provider_name 
                  FROM provider_orders po 
                  JOIN users u ON po.provider_id = u.id ';
        $params = [];
        
        if ($role === 'provider') {
            $query .= 'WHERE po.provider_id = ? ';
            $params[] = $userId;
        }
        
        $query .= 'ORDER BY po.created_at DESC';
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        // fetch items for each order
        $stmtItems = $pdo->prepare('
            SELECT poi.product_id, poi.quantity, p.name 
            FROM provider_order_items poi 
            JOIN products p ON poi.product_id = p.id 
            WHERE poi.order_id = ?
        ');

        foreach ($orders as &$order) {
            $stmtItems->execute([$order['id']]);
            $order['items'] = $stmtItems->fetchAll();
        }

        sendJSON(['orders' => $orders]);
    } elseif ($action === 'low_stock') {
         // Let anyone in this module see what products need restocking
         $stmt = $pdo->query('SELECT id, name, stock FROM products WHERE stock < 10 ORDER BY stock ASC');
         sendJSON(['products' => $stmt->fetchAll()]);
    } elseif ($action === 'list_providers') {
         // Return all providers (users with role 'provider')
         $stmt = $pdo->query("SELECT id, username FROM users WHERE role = 'provider' ORDER BY username ASC");
         sendJSON(['providers' => $stmt->fetchAll()]);
    } elseif ($action === 'list_products') {
         // Return all products
         $stmt = $pdo->query("SELECT id, name, stock FROM products ORDER BY name ASC");
         sendJSON(['products' => $stmt->fetchAll()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJSONInput();

    if ($action === 'create_order') {
        // Everyone can create, but typically Provider creates their order proposals
        $providerId = $role === 'provider' ? $userId : ($input['provider_id'] ?? $userId);
        $items = $input['items'] ?? []; // ['product_id' => 1, 'quantity' => 10]
        $notes = $input['notes'] ?? '';

        if (empty($items)) {
             sendJSON(['error' => 'No items provided'], 400);
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('INSERT INTO provider_orders (provider_id, status, notes) VALUES (?, ?, ?) RETURNING id');
            $stmt->execute([$providerId, 'pending', $notes]);
            $orderId = $stmt->fetchColumn();

            $stmtItem = $pdo->prepare('INSERT INTO provider_order_items (order_id, product_id, quantity) VALUES (?, ?, ?)');
            foreach ($items as $item) {
                 $stmtItem->execute([$orderId, $item['product_id'], $item['quantity']]);
            }
            $pdo->commit();
            sendJSON(['success' => true, 'order_id' => $orderId]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendJSON(['error' => 'Failed creating order'], 500);
        }

    } elseif ($action === 'update_order_status' && $role === 'admin') {
        // Admin receives the fulfilled order and marks it completed, which adds stock
        
        $orderId = $input['order_id'] ?? 0;
        $status = $input['status'] ?? ''; // Should be 'completed' or 'cancelled'

        if (!in_array($status, ['completed', 'cancelled'])) {
            sendJSON(['error' => 'Invalid status limit for admin'], 400);
        }

        $pdo->beginTransaction();
        try {
            // Read current status to ensure valid transition
            $stmtGet = $pdo->prepare('SELECT status FROM provider_orders WHERE id = ? FOR UPDATE');
            $stmtGet->execute([$orderId]);
            $currentStatus = $stmtGet->fetchColumn();

            if ($status === 'completed' && $currentStatus !== 'fulfilled') {
                $pdo->rollBack();
                sendJSON(['error' => 'Order must be fulfilled by provider before receiving'], 400);
            }

            $stmt = $pdo->prepare('UPDATE provider_orders SET status = ? WHERE id = ? RETURNING status');
            $stmt->execute([$status, $orderId]);

            if ($status === 'completed') {
                // If completed, add stock.
                $stmtItems = $pdo->prepare('SELECT product_id, quantity FROM provider_order_items WHERE order_id = ?');
                $stmtItems->execute([$orderId]);
                $items = $stmtItems->fetchAll();

                $stmtUpdateStock = $pdo->prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
                $stmtInsertTrans = $pdo->prepare('INSERT INTO inventory_transactions (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)');

                foreach ($items as $item) {
                     $stmtUpdateStock->execute([$item['quantity'], $item['product_id']]);
                     $stmtInsertTrans->execute([$item['product_id'], 'in', $item['quantity'], "Provider Order #$orderId"]);
                }
            }

            $pdo->commit();
            sendJSON(['success' => true]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendJSON(['error' => 'Update failed: ' . $e->getMessage()], 500);
        }
    } elseif ($action === 'update_order_status_provider' && $role === 'provider') {
         // Provider can cancel their own pending order, or fulfill a pending one
         $orderId = $input['order_id'] ?? 0;
         $status = $input['status'] ?? '';

         if (!in_array($status, ['cancelled', 'fulfilled'])) {
             sendJSON(['error' => 'Provider can only fulfill or cancel'], 403);
         }
         
         $stmt = $pdo->prepare('UPDATE provider_orders SET status = ? WHERE id = ? AND provider_id = ? AND status = \'pending\'');
         $stmt->execute([$status, $orderId, $userId]);
         
         if ($stmt->rowCount() > 0) {
             sendJSON(['success' => true]);
         } else {
             sendJSON(['error' => 'No order updated (might already be processed)'], 400);
         }
    }
}

sendJSON(['error' => 'Invalid action'], 400);
?>
