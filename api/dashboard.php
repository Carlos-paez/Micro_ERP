<?php
// api/dashboard.php
session_start();
require_once 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    sendJSON(['error' => 'Unauthorized'], 403);
}

$action = $_GET['action'] ?? 'stats';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'stats') {
    try {
        // Total products count
        $stmt = $pdo->query('SELECT COUNT(*) as total_products FROM products');
        $totalProducts = $stmt->fetch()['total_products'];

        // Low stock products (e.g., stock < 10)
        $stmt = $pdo->query('SELECT COUNT(*) as low_stock FROM products WHERE stock < 10');
        $lowStock = $stmt->fetch()['low_stock'];

        // Total sales value
        $stmt = $pdo->query('SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM sales');
        $totalRevenue = $stmt->fetch()['total_revenue'];

        // Recent sales
        $stmt = $pdo->query('SELECT id, total_amount, created_at FROM sales ORDER BY created_at DESC LIMIT 5');
        $recentSales = $stmt->fetchAll();

        // Equipment in use
        $stmt = $pdo->query("SELECT COUNT(*) as equipment_in_use FROM equipment WHERE status = 'in_use'");
        $equipmentInUse = $stmt->fetch()['equipment_in_use'];

        sendJSON([
            'stats' => [
                'total_products' => $totalProducts,
                'low_stock' => $lowStock,
                'total_revenue' => $totalRevenue,
                'equipment_in_use' => $equipmentInUse
            ],
            'recent_sales' => $recentSales
        ]);
    } catch (\PDOException $e) {
        sendJSON(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    sendJSON(['error' => 'Invalid action'], 400);
}
?>
