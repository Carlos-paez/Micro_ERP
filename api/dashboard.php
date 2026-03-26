<?php
// api/dashboard.php - Enhanced Dashboard
session_start();
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    sendJSON(['error' => 'Unauthorized'], 403);
}

$user_id = $_SESSION['user_id'];
$role = $_SESSION['role'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'stats';
    
    if ($action === 'stats') {
        try {
            $today = date('Y-m-d');
            $month_start = date('Y-m-01');
            
            $stats = [];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM products WHERE is_active = 1");
            $stats['total_products'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM products WHERE is_active = 1 AND stock <= min_stock");
            $stats['low_stock'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE status = 'completed' AND DATE(created_at) = '$today'");
            $stats['today_sales'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE status = 'completed' AND DATE(created_at) BETWEEN '$month_start' AND '$today'");
            $stats['month_sales'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(total_cost), 0) as total FROM cyber_sessions WHERE status = 'completed' AND DATE(start_time) = '$today'");
            $stats['today_cyber'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(total_price), 0) as total FROM service_transactions WHERE DATE(created_at) = '$today'");
            $stats['today_services'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM cyber_sessions WHERE status IN ('active', 'paused')");
            $stats['active_cyber_sessions'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM equipment WHERE status = 'in_use'");
            $stats['equipment_in_use'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(price * stock), 0) as total FROM products WHERE is_active = 1 AND stock > 0");
            $stats['inventory_value'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM provider_orders WHERE status IN ('pending', 'sent', 'confirmed', 'in_transit')");
            $stats['pending_orders'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT id, total_amount, created_at, payment_method FROM sales WHERE status = 'completed' ORDER BY created_at DESC LIMIT 10");
            $recent_sales = $stmt->fetchAll();
            
            $stmt = $pdo->query("SELECT cs.id, cs.customer_name, cs.total_cost, cs.start_time, s.name as station_name
                FROM cyber_sessions cs
                JOIN computer_stations s ON cs.station_id = s.id
                WHERE cs.status IN ('active', 'paused')
                ORDER BY cs.start_time DESC");
            $active_sessions = $stmt->fetchAll();
            
            $stmt = $pdo->query("SELECT p.id, p.name, p.stock, p.min_stock, c.name as category
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.is_active = 1 AND p.stock <= p.min_stock
                ORDER BY p.stock ASC
                LIMIT 5");
            $low_stock_products = $stmt->fetchAll();
            
            $stmt = $pdo->query("SELECT id, total_amount, created_at, status FROM provider_orders ORDER BY created_at DESC LIMIT 5");
            $recent_orders = $stmt->fetchAll();
            
            $stmt = $pdo->query("SELECT 
                DATE(created_at) as date,
                COALESCE(SUM(total_amount), 0) as total
                FROM sales
                WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date");
            $weekly_sales = $stmt->fetchAll();
            
            $result = [
                'stats' => $stats,
                'recent_sales' => $recent_sales,
                'active_sessions' => $active_sessions,
                'low_stock_products' => $low_stock_products,
                'recent_orders' => $recent_orders,
                'weekly_sales' => $weekly_sales
            ];
            
            sendJSON($result);
        } catch (PDOException $e) {
            sendJSON(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    } else {
        sendJSON(['error' => 'Invalid action'], 400);
    }
} else {
    sendJSON(['error' => 'Method not allowed'], 405);
}
?>
