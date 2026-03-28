<?php
// api/inventory.php - Enhanced Inventory Management
session_start();
require_once 'db.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function isAdmin() {
    return isset($_SESSION['user_id']) && isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
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

function generateSKU($pdo, $name) {
    $prefix = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $name), 0, 3));
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM products");
    $cnt = $stmt->fetch()['cnt'] + 1;
    return $prefix . '-' . str_pad($cnt, 4, '0', STR_PAD_LEFT);
}

function logTransaction($pdo, $product_id, $type, $quantity, $stock_before, $stock_after, $notes, $user_id) {
    $stmt = $pdo->prepare("INSERT INTO inventory_transactions 
        (product_id, type, quantity, stock_before, stock_after, notes, user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$product_id, $type, $quantity, $stock_before, $stock_after, $notes, $user_id]);
}

$action = $_GET['action'] ?? '';
$user_id = $_SESSION['user_id'] ?? null;

switch($action) {
    case 'list':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $category_id = intval($_GET['category_id'] ?? 0);
            $stock_filter = $_GET['stock_filter'] ?? '';
            
            $sql = "SELECT p.*, c.name as category_name,
                    (p.price * p.stock) as stock_value,
                    CASE 
                        WHEN p.stock <= 0 THEN 'out_of_stock'
                        WHEN p.stock <= p.min_stock THEN 'low_stock'
                        ELSE 'normal'
                    END as stock_status
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE p.is_active = 1";
            
            $params = [];
            if ($category_id > 0) {
                $sql .= " AND p.category_id = ?";
                $params[] = $category_id;
            }
            if ($stock_filter === 'low') {
                $sql .= " AND p.stock <= p.min_stock";
            } elseif ($stock_filter === 'out') {
                $sql .= " AND p.stock <= 0";
            }
            
            $sql .= " ORDER BY p.name";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $products = $stmt->fetchAll();
            
            sendJSON(['products' => $products]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'get':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        $id = intval($_GET['id'] ?? 0);
        try {
            $stmt = $pdo->prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?");
            $stmt->execute([$id]);
            $product = $stmt->fetch();
            if (!$product) sendJSON(['error' => 'Producto no encontrado'], 404);
            sendJSON(['product' => $product]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'add_product':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        
        if (empty($data['name'])) sendJSON(['error' => 'Nombre requerido'], 400);
        
        try {
            $sku = $data['sku'] ?? generateSKU($pdo, $data['name']);
            
            $stmt = $pdo->prepare("INSERT INTO products 
                (sku, name, description, category_id, price, cost_price, stock, min_stock, max_stock, unit, barcode, location) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $sku,
                $data['name'],
                $data['description'] ?? null,
                $data['category_id'] ?? null,
                $data['price'] ?? 0,
                $data['cost_price'] ?? 0,
                $data['stock'] ?? 0,
                $data['min_stock'] ?? 5,
                $data['max_stock'] ?? 100,
                $data['unit'] ?? 'unidad',
                $data['barcode'] ?? null,
                $data['location'] ?? null
            ]);
            
            $product_id = $pdo->lastInsertId();
            
            if (($data['stock'] ?? 0) > 0) {
                logTransaction($pdo, $product_id, 'in', $data['stock'], 0, $data['stock'], 'Stock inicial', $user_id);
            }
            
            sendJSON(['success' => true, 'id' => $product_id, 'message' => 'Producto creado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'update_product':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $id = intval($data['id'] ?? 0);
        if (!$id) sendJSON(['error' => 'ID requerido'], 400);
        
        try {
            $stmt = $pdo->prepare("UPDATE products SET 
                name = ?, description = ?, category_id = ?, price = ?, cost_price = ?, 
                min_stock = ?, max_stock = ?, unit = ?, barcode = ?, location = ?
                WHERE id = ?");
            $stmt->execute([
                $data['name'],
                $data['description'] ?? null,
                $data['category_id'] ?? null,
                $data['price'] ?? 0,
                $data['cost_price'] ?? 0,
                $data['min_stock'] ?? 5,
                $data['max_stock'] ?? 100,
                $data['unit'] ?? 'unidad',
                $data['barcode'] ?? null,
                $data['location'] ?? null,
                $id
            ]);
            sendJSON(['success' => true, 'message' => 'Producto actualizado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'update_stock':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $product_id = intval($data['product_id'] ?? 0);
        $type = $data['type'] ?? '';
        $quantity = intval($data['quantity'] ?? 0);
        
        if (!$product_id || !$type || $quantity <= 0) {
            sendJSON(['error' => 'Datos inválidos'], 400);
        }
        
        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("SELECT stock FROM products WHERE id = ? FOR UPDATE");
            $stmt->execute([$product_id]);
            $product = $stmt->fetch();
            
            if (!$product) {
                $pdo->rollBack();
                sendJSON(['error' => 'Producto no encontrado'], 404);
            }
            
            $stock_before = $product['stock'];
            if ($type === 'in') {
                $stock_after = $stock_before + $quantity;
            } else {
                if ($stock_before < $quantity) {
                    $pdo->rollBack();
                    sendJSON(['error' => 'Stock insuficiente'], 400);
                }
                $stock_after = $stock_before - $quantity;
            }
            
            $stmt = $pdo->prepare("UPDATE products SET stock = ? WHERE id = ?");
            $stmt->execute([$stock_after, $product_id]);
            
            logTransaction($pdo, $product_id, $type, $quantity, $stock_before, $stock_after, $data['notes'] ?? 'Ajuste manual', $user_id);
            
            $pdo->commit();
            sendJSON(['success' => true, 'message' => 'Stock actualizado', 'stock' => $stock_after]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'sell':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $items = $data['items'] ?? [];
        
        if (empty($items)) sendJSON(['error' => 'No hay productos en la venta'], 400);
        
        try {
            $pdo->beginTransaction();
            
            $invoice = 'INV-' . date('Ymd') . '-' . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
            $subtotal = 0;
            
            foreach ($items as $item) {
                $price = floatval($item['price'] ?? 0);
                $qty = intval($item['quantity'] ?? 0);
                $subtotal += $price * $qty;
            }
            
            $stmt = $pdo->prepare("INSERT INTO sales 
                (invoice_number, customer_name, subtotal, total_amount, payment_method, user_id) 
                VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $invoice,
                $data['customer_name'] ?? 'Cliente Mostrador',
                $subtotal,
                $subtotal,
                $data['payment_method'] ?? 'cash',
                $user_id
            ]);
            $sale_id = $pdo->lastInsertId();
            
            foreach ($items as $item) {
                $product_id = intval($item['product_id']);
                $qty = intval($item['quantity']);
                $price = floatval($item['price']);
                
                $stmt = $pdo->prepare("SELECT stock FROM products WHERE id = ? FOR UPDATE");
                $stmt->execute([$product_id]);
                $product = $stmt->fetch();
                
                if (!$product || $product['stock'] < $qty) {
                    $pdo->rollBack();
                    sendJSON(['error' => 'Stock insuficiente para producto ID: ' . $product_id], 400);
                }
                
                $stock_before = $product['stock'];
                $stock_after = $stock_before - $qty;
                
                $stmt = $pdo->prepare("UPDATE products SET stock = ? WHERE id = ?");
                $stmt->execute([$stock_after, $product_id]);
                
                $stmt = $pdo->prepare("INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$sale_id, $product_id, $qty, $price, $price * $qty]);
                
                logTransaction($pdo, $product_id, 'out', $qty, $stock_before, $stock_after, "Venta #$invoice", $user_id);
            }
            
            $pdo->commit();
            sendJSON(['success' => true, 'sale_id' => $sale_id, 'invoice' => $invoice, 'message' => 'Venta registrada']);
        } catch (PDOException $e) {
            $pdo->rollBack();
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'delete_product':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $id = intval($data['product_id'] ?? 0);
        if (!$id) sendJSON(['error' => 'ID requerido'], 400);
        
        try {
            $stmt = $pdo->prepare("UPDATE products SET is_active = 0 WHERE id = ?");
            $stmt->execute([$id]);
            sendJSON(['success' => true, 'message' => 'Producto eliminado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'transactions':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $product_id = intval($_GET['product_id'] ?? 0);
        $limit = intval($_GET['limit'] ?? 50);
        
        try {
            $sql = "SELECT t.*, u.username, p.name as product_name 
                    FROM inventory_transactions t
                    LEFT JOIN users u ON t.user_id = u.id
                    LEFT JOIN products p ON t.product_id = p.id
                    WHERE 1=1";
            $params = [];
            
            if ($product_id > 0) {
                $sql .= " AND t.product_id = ?";
                $params[] = $product_id;
            }
            
            $sql .= " ORDER BY t.created_at DESC LIMIT ?";
            $params[] = $limit;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $transactions = $stmt->fetchAll();
            
            sendJSON(['transactions' => $transactions]);
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

    case 'valuation':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT 
                COUNT(*) as total_products,
                SUM(stock) as total_units,
                SUM(price * stock) as total_value,
                SUM(cost_price * stock) as total_cost,
                SUM((price - cost_price) * stock) as total_profit
                FROM products 
                WHERE is_active = 1 AND stock > 0");
            $valuation = $stmt->fetch();
            sendJSON(['valuation' => $valuation]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    default:
        sendJSON(['error' => 'Acción no válida'], 400);
}
