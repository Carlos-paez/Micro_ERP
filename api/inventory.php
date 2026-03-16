<?php
// api/inventory.php
session_start();
require_once 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    sendJSON(['error' => 'Unauthorized'], 403);
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list') {
        $stmt = $pdo->query('SELECT * FROM products ORDER BY name ASC');
        sendJSON(['products' => $stmt->fetchAll()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJSONInput();

    if ($action === 'add_product') {
        $name = $input['name'] ?? '';
        $description = $input['description'] ?? '';
        $price = $input['price'] ?? 0;
        $stock = $input['stock'] ?? 0;

        if (empty($name) || $price < 0 || $stock < 0) {
            sendJSON(['error' => 'Invalid product data'], 400);
        }

        $stmt = $pdo->prepare('INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?) RETURNING id');
        $stmt->execute([$name, $description, $price, $stock]);
        sendJSON(['success' => true, 'id' => $stmt->fetchColumn()]);

    } elseif ($action === 'update_stock') {
        $product_id = $input['product_id'] ?? 0;
        $quantity = $input['quantity'] ?? 0;
        $type = $input['type'] ?? 'in'; // 'in' or 'out'
        $notes = $input['notes'] ?? '';

        if ($product_id <= 0 || $quantity <= 0 || !in_array($type, ['in', 'out'])) {
            sendJSON(['error' => 'Invalid data'], 400);
        }

        $pdo->beginTransaction();
        try {
            // Update stock
            $stockChange = $type === 'in' ? $quantity : -$quantity;
            $stmt = $pdo->prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
            $stmt->execute([$stockChange, $product_id]);

            // Record transaction
            $stmt = $pdo->prepare('INSERT INTO inventory_transactions (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)');
            $stmt->execute([$product_id, $type, $quantity, $notes]);

            $pdo->commit();
            sendJSON(['success' => true]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendJSON(['error' => 'Transaction failed'], 500);
        }
    } elseif ($action === 'sell') {
        $items = $input['items'] ?? []; // Array of ['product_id' => 1, 'quantity' => 2, 'price' => 10.5]
        
        if (empty($items)) {
            sendJSON(['error' => 'No items provided'], 400);
        }

        $pdo->beginTransaction();
        try {
            $totalAmount = 0;
            foreach ($items as $item) {
                $totalAmount += ($item['quantity'] * $item['price']);
            }

            // Create sale record
            $stmt = $pdo->prepare('INSERT INTO sales (total_amount) VALUES (?) RETURNING id');
            $stmt->execute([$totalAmount]);
            $saleId = $stmt->fetchColumn();

            // Record items and update stock
            $stmtInsertItem = $pdo->prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
            $stmtUpdateStock = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
            $stmtInsertTrans = $pdo->prepare('INSERT INTO inventory_transactions (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)');

            foreach ($items as $item) {
                $stmtInsertItem->execute([$saleId, $item['product_id'], $item['quantity'], $item['price']]);
                $stmtUpdateStock->execute([$item['quantity'], $item['product_id']]);
                $stmtInsertTrans->execute([$item['product_id'], 'out', $item['quantity'], "Sale #$saleId"]);
            }

            $pdo->commit();
            sendJSON(['success' => true, 'sale_id' => $saleId]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendJSON(['error' => 'Sale recording failed: ' . $e->getMessage()], 500);
        }
    } elseif ($action === 'delete_product') {
        $product_id = $input['product_id'] ?? 0;
        
        if ($product_id <= 0) {
            sendJSON(['error' => 'Invalid product ID'], 400);
        }

        try {
            // Note: Since we have ON DELETE CASCADE in the schema on foreign keys, 
            // deleting a product will cascade and delete associated transactions/sales items.
            // Be very careful. In a real ERP you might want to "soft delete" instead.
            // But per requirement, we implement delete.
            $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
            $stmt->execute([$product_id]);
            sendJSON(['success' => true]);
        } catch (\Exception $e) {
            sendJSON(['error' => 'Failed to delete product: ' . $e->getMessage()], 500);
        }
    }
}

sendJSON(['error' => 'Invalid action'], 400);
?>
