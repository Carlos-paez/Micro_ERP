<?php
// api/reports.php - Advanced Reports and Statistics
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

$action = $_GET['action'] ?? '';

switch($action) {
    case 'dashboard':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $today = date('Y-m-d');
            $month_start = date('Y-m-01');
            $week_start = date('Y-m-d', strtotime('monday this week'));
            
            $stats = [];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM products WHERE is_active = 1");
            $stats['total_products'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM products WHERE is_active = 1 AND stock <= min_stock");
            $stats['low_stock'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM products WHERE is_active = 1 AND stock <= 0");
            $stats['out_of_stock'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE status = 'completed' AND DATE(created_at) = '$today'");
            $stats['today_sales'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE status = 'completed' AND DATE(created_at) BETWEEN '$month_start' AND '$today'");
            $stats['month_sales'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(total_cost), 0) as total FROM cyber_sessions WHERE status = 'completed' AND DATE(start_time) = '$today'");
            $stats['today_cyber'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(total_cost), 0) as total FROM cyber_sessions WHERE status = 'completed' AND DATE(start_time) BETWEEN '$month_start' AND '$today'");
            $stats['month_cyber'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(total_price), 0) as total FROM service_transactions WHERE DATE(created_at) = '$today'");
            $stats['today_services'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM cyber_sessions WHERE status IN ('active', 'paused')");
            $stats['active_cyber_sessions'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM equipment WHERE status = 'in_use'");
            $stats['equipment_in_use'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(price * stock), 0) as total FROM products WHERE is_active = 1 AND stock > 0");
            $stats['inventory_value'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COALESCE(SUM(price * stock), 0) - COALESCE(SUM(cost_price * stock), 0) as total FROM products WHERE is_active = 1 AND stock > 0");
            $stats['potential_profit'] = $stmt->fetch()['total'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM provider_orders WHERE status IN ('pending', 'confirmed', 'in_transit', 'received')");
            $stats['pending_orders'] = $stmt->fetch()['total'];
            
            sendJSON(['stats' => $stats]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'sales_report':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $date_from = $_GET['date_from'] ?? date('Y-m-01');
        $date_to = $_GET['date_to'] ?? date('Y-m-d');
        $group_by = $_GET['group_by'] ?? 'day';
        
        try {
            $date_format = $group_by === 'month' ? '%Y-%m' : '%Y-%m-%d';
            
            $stmt = $pdo->prepare("SELECT 
                DATE_FORMAT(created_at, '$date_format') as period,
                COUNT(*) as transactions,
                SUM(total_amount) as total,
                AVG(total_amount) as average,
                SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as cash_total,
                SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END) as card_total,
                SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END) as transfer_total
                FROM sales 
                WHERE status = 'completed' AND DATE(created_at) BETWEEN ? AND ?
                GROUP BY DATE_FORMAT(created_at, '$date_format')
                ORDER BY period");
            $stmt->execute([$date_from, $date_to]);
            $data = $stmt->fetchAll();
            
            $stmt = $pdo->prepare("SELECT COUNT(*) as total, COALESCE(SUM(total_amount), 0) as total_amount FROM sales WHERE status = 'completed' AND DATE(created_at) BETWEEN ? AND ?");
            $stmt->execute([$date_from, $date_to]);
            $totals = $stmt->fetch();
            
            sendJSON(['data' => $data, 'totals' => $totals]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'top_products':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $date_from = $_GET['date_from'] ?? date('Y-m-01');
        $date_to = $_GET['date_to'] ?? date('Y-m-d');
        $limit = intval($_GET['limit'] ?? 10);
        
        try {
            $stmt = $pdo->prepare("SELECT 
                p.id, p.name, p.sku, p.price, p.stock,
                COUNT(si.id) as times_sold,
                SUM(si.quantity) as total_qty_sold,
                SUM(si.subtotal) as total_revenue
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                JOIN sales s ON si.sale_id = s.id
                WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?
                GROUP BY p.id
                ORDER BY total_revenue DESC
                LIMIT ?");
            $stmt->execute([$date_from, $date_to, $limit]);
            $products = $stmt->fetchAll();
            
            sendJSON(['products' => $products]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'cyber_report':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $date_from = $_GET['date_from'] ?? date('Y-m-01');
        $date_to = $_GET['date_to'] ?? date('Y-m-d');
        
        try {
            $stmt = $pdo->prepare("SELECT 
                DATE(start_time) as date,
                COUNT(*) as sessions,
                SUM(time_used_seconds) / 60 as total_minutes,
                SUM(total_cost) as total_revenue,
                AVG(total_cost) as avg_ticket,
                AVG(time_used_seconds) / 60 as avg_duration
                FROM cyber_sessions
                WHERE status = 'completed' AND DATE(start_time) BETWEEN ? AND ?
                GROUP BY DATE(start_time)
                ORDER BY date");
            $stmt->execute([$date_from, $date_to]);
            $daily = $stmt->fetchAll();
            
            $stmt = $pdo->prepare("SELECT 
                cs.station_id, s.name as station_name,
                COUNT(*) as sessions,
                SUM(time_used_seconds) / 60 as total_minutes,
                SUM(total_cost) as total_revenue
                FROM cyber_sessions cs
                JOIN computer_stations s ON cs.station_id = s.id
                WHERE cs.status = 'completed' AND DATE(cs.start_time) BETWEEN ? AND ?
                GROUP BY cs.station_id
                ORDER BY total_revenue DESC");
            $stmt->execute([$date_from, $date_to]);
            $by_station = $stmt->fetchAll();
            
            $stmt = $pdo->prepare("SELECT 
                COUNT(*) as total_sessions,
                SUM(time_used_seconds) / 60 as total_minutes,
                SUM(total_cost) as total_revenue
                FROM cyber_sessions
                WHERE status = 'completed' AND DATE(start_time) BETWEEN ? AND ?");
            $stmt->execute([$date_from, $date_to]);
            $totals = $stmt->fetch();
            
            sendJSON(['daily' => $daily, 'by_station' => $by_station, 'totals' => $totals]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'services_report':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $date_from = $_GET['date_from'] ?? date('Y-m-01');
        $date_to = $_GET['date_to'] ?? date('Y-m-d');
        
        try {
            $stmt = $pdo->prepare("SELECT 
                s.category,
                COUNT(st.id) as transactions,
                SUM(st.total_price) as total_revenue
                FROM service_transactions st
                JOIN services s ON st.service_id = s.id
                WHERE DATE(st.created_at) BETWEEN ? AND ?
                GROUP BY s.category
                ORDER BY total_revenue DESC");
            $stmt->execute([$date_from, $date_to]);
            $by_category = $stmt->fetchAll();
            
            $stmt = $pdo->prepare("SELECT 
                s.name, s.category, s.price,
                COUNT(st.id) as times_used,
                SUM(st.total_price) as total_revenue
                FROM service_transactions st
                JOIN services s ON st.service_id = s.id
                WHERE DATE(st.created_at) BETWEEN ? AND ?
                GROUP BY s.id
                ORDER BY total_revenue DESC");
            $stmt->execute([$date_from, $date_to]);
            $by_service = $stmt->fetchAll();
            
            $stmt = $pdo->prepare("SELECT 
                COUNT(*) as total_transactions,
                SUM(total_price) as total_revenue
                FROM service_transactions
                WHERE DATE(created_at) BETWEEN ? AND ?");
            $stmt->execute([$date_from, $date_to]);
            $totals = $stmt->fetch();
            
            sendJSON(['by_category' => $by_category, 'by_service' => $by_service, 'totals' => $totals]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'inventory_report':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT 
                c.name as category,
                COUNT(p.id) as products,
                SUM(p.stock) as total_stock,
                SUM(p.price * p.stock) as total_value,
                SUM((p.price - p.cost_price) * p.stock) as total_profit
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.is_active = 1
                GROUP BY c.id
                ORDER BY total_value DESC");
            $by_category = $stmt->fetchAll();
            
            $stmt = $pdo->query("SELECT 
                CASE 
                    WHEN stock <= 0 THEN 'Agotado'
                    WHEN stock <= min_stock THEN 'Stock Bajo'
                    WHEN stock >= max_stock THEN 'Sobre Stock'
                    ELSE 'Normal'
                END as status,
                COUNT(*) as count
                FROM products
                WHERE is_active = 1
                GROUP BY status");
            $by_status = $stmt->fetchAll();
            
            $stmt = $pdo->query("SELECT 
                p.id, p.sku, p.name, p.stock, p.min_stock, p.max_stock, p.price, p.cost_price,
                c.name as category
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.is_active = 1 AND p.stock <= p.min_stock
                ORDER BY p.stock ASC");
            $low_stock = $stmt->fetchAll();
            
            $stmt = $pdo->query("SELECT 
                COUNT(*) as total_products,
                SUM(stock) as total_units,
                SUM(price * stock) as total_value,
                SUM(cost_price * stock) as total_cost,
                SUM((price - cost_price) * stock) as total_profit
                FROM products
                WHERE is_active = 1 AND stock > 0");
            $totals = $stmt->fetch();
            
            sendJSON(['by_category' => $by_category, 'by_status' => $by_status, 'low_stock' => $low_stock, 'totals' => $totals]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'suppliers_report':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT 
                s.id, s.name, s.company_name, s.contact_name, s.phone, s.email,
                COUNT(po.id) as total_orders,
                SUM(CASE WHEN po.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                COALESCE(SUM(po.total_amount), 0) as total_purchases
                FROM suppliers s
                LEFT JOIN provider_orders po ON s.id = po.supplier_id
                WHERE s.is_active = 1
                GROUP BY s.id
                ORDER BY total_purchases DESC");
            $suppliers = $stmt->fetchAll();
            
            $stmt = $pdo->query("SELECT 
                DATE(po.created_at) as date,
                COUNT(*) as orders,
                SUM(po.total_amount) as total
                FROM provider_orders po
                WHERE po.status = 'completed' AND po.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(po.created_at)
                ORDER BY date");
            $recent = $stmt->fetchAll();
            
            $stmt = $pdo->query("SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as total_amount
                FROM provider_orders
                WHERE status = 'completed'");
            $totals = $stmt->fetch();
            
            sendJSON(['suppliers' => $suppliers, 'recent_orders' => $recent, 'totals' => $totals]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'daily_summary':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $date = $_GET['date'] ?? date('Y-m-d');
        
        try {
            $stmt = $pdo->prepare("SELECT 
                COALESCE(SUM(total_amount), 0) as sales_total,
                COUNT(*) as sales_count
                FROM sales 
                WHERE status = 'completed' AND DATE(created_at) = ?");
            $stmt->execute([$date]);
            $sales = $stmt->fetch();
            
            $stmt = $pdo->prepare("SELECT 
                COALESCE(SUM(total_cost), 0) as cyber_total,
                COUNT(*) as cyber_sessions
                FROM cyber_sessions 
                WHERE status = 'completed' AND DATE(start_time) = ?");
            $stmt->execute([$date]);
            $cyber = $stmt->fetch();
            
            $stmt = $pdo->prepare("SELECT 
                COALESCE(SUM(total_price), 0) as services_total,
                COUNT(*) as services_count
                FROM service_transactions 
                WHERE DATE(created_at) = ?");
            $stmt->execute([$date]);
            $services = $stmt->fetch();
            
            $stmt = $pdo->prepare("SELECT 
                COALESCE(SUM(total_amount), 0) as purchases_total,
                COUNT(*) as purchases_count
                FROM provider_orders 
                WHERE status = 'completed' AND DATE(created_at) = ?");
            $stmt->execute([$date]);
            $purchases = $stmt->fetch();
            
            $total_income = $sales['sales_total'] + $cyber['cyber_total'] + $services['services_total'];
            $total_expenses = $purchases['purchases_total'];
            $profit = $total_income - $total_expenses;
            
            $stmt = $pdo->prepare("SELECT 
                s.name as product_name, si.quantity, si.unit_price, si.subtotal,
                s.invoice_number, s.payment_method, s.created_at
                FROM sales s
                JOIN sale_items si ON s.id = si.sale_id
                WHERE s.status = 'completed' AND DATE(s.created_at) = ?
                ORDER BY s.created_at DESC
                LIMIT 20");
            $stmt->execute([$date]);
            $sales_detail = $stmt->fetchAll();
            
            sendJSON([
                'date' => $date,
                'sales' => $sales,
                'cyber' => $cyber,
                'services' => $services,
                'purchases' => $purchases,
                'total_income' => $total_income,
                'total_expenses' => $total_expenses,
                'profit' => $profit,
                'sales_detail' => $sales_detail
            ]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'profit_loss':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $date_from = $_GET['date_from'] ?? date('Y-m-01');
        $date_to = $_GET['date_to'] ?? date('Y-m-d');
        
        try {
            $stmt = $pdo->prepare("SELECT 
                COALESCE(SUM(subtotal), 0) as total_sales,
                COALESCE(SUM(subtotal * (SELECT cost_price FROM products WHERE id = sale_items.product_id)), 0) as total_cost
                FROM sale_items si
                JOIN sales s ON si.sale_id = s.id
                WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?");
            $stmt->execute([$date_from, $date_to]);
            $sales_data = $stmt->fetch();
            
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(total_cost), 0) as total FROM cyber_sessions WHERE status = 'completed' AND DATE(start_time) BETWEEN ? AND ?");
            $stmt->execute([$date_from, $date_to]);
            $cyber_revenue = $stmt->fetch()['total'];
            
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM service_transactions WHERE DATE(created_at) BETWEEN ? AND ?");
            $stmt->execute([$date_from, $date_to]);
            $services_revenue = $stmt->fetch()['total'];
            
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM provider_orders WHERE status = 'completed' AND DATE(created_at) BETWEEN ? AND ?");
            $stmt->execute([$date_from, $date_to]);
            $purchases = $stmt->fetch()['total'];
            
            $gross_revenue = $sales_data['total_sales'] + $cyber_revenue + $services_revenue;
            $total_cost = $sales_data['total_cost'] + $purchases;
            $gross_profit = $gross_revenue - $total_cost;
            $profit_margin = $gross_revenue > 0 ? ($gross_profit / $gross_revenue * 100) : 0;
            
            sendJSON([
                'period' => ['from' => $date_from, 'to' => $date_to],
                'revenue' => [
                    'sales' => $sales_data['total_sales'],
                    'cyber' => $cyber_revenue,
                    'services' => $services_revenue,
                    'total' => $gross_revenue
                ],
                'costs' => [
                    'products_cost' => $sales_data['total_cost'],
                    'purchases' => $purchases,
                    'total' => $total_cost
                ],
                'gross_profit' => $gross_profit,
                'profit_margin' => round($profit_margin, 2)
            ]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'export':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $type = $_GET['type'] ?? 'sales';
        $format = $_GET['format'] ?? 'json';
        $date_from = $_GET['date_from'] ?? date('Y-m-01');
        $date_to = $_GET['date_to'] ?? date('Y-m-d');
        
        try {
            $data = [];
            
            switch($type) {
                case 'sales':
                    $stmt = $pdo->prepare("SELECT s.*, si.product_id, p.name as product_name, si.quantity, si.unit_price, si.subtotal
                        FROM sales s
                        JOIN sale_items si ON s.id = si.sale_id
                        LEFT JOIN products p ON si.product_id = p.id
                        WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?
                        ORDER BY s.created_at DESC");
                    $stmt->execute([$date_from, $date_to]);
                    $data = $stmt->fetchAll();
                    break;
                    
                case 'inventory':
                    $stmt = $pdo->prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1 ORDER BY p.name");
                    $stmt->execute();
                    $data = $stmt->fetchAll();
                    break;
                    
                case 'cyber':
                    $stmt = $pdo->prepare("SELECT cs.*, s.name as station_name FROM cyber_sessions cs JOIN computer_stations s ON cs.station_id = s.id WHERE DATE(cs.start_time) BETWEEN ? AND ? ORDER BY cs.start_time DESC");
                    $stmt->execute([$date_from, $date_to]);
                    $data = $stmt->fetchAll();
                    break;
            }
            
            if ($format === 'csv') {
                header('Content-Type: text/csv');
                header('Content-Disposition: attachment; filename="' . $type . '_' . $date_from . '_' . $date_to . '.csv"');
                
                if (!empty($data)) {
                    echo implode(',', array_keys($data[0])) . "\n";
                    foreach ($data as $row) {
                        echo implode(',', array_map(function($v) { return '"' . str_replace('"', '""', $v) . '"'; }, $row)) . "\n";
                    }
                }
                exit;
            }
            
            sendJSON(['data' => $data]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    default:
        sendJSON(['error' => 'Acción no válida'], 400);
}
?>
