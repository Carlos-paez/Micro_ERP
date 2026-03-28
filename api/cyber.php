<?php
// api/cyber.php - Cibercontrol Management
session_start();
require_once 'db.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function isAdmin() {
    return isset($_SESSION['user_id']) && isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function isOperator() {
    return isset($_SESSION['user_id']) && isset($_SESSION['role']) && in_array($_SESSION['role'], ['admin', 'operator']);
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

switch($action) {
    case 'list_stations':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT cs.*, 
                (SELECT COUNT(*) FROM cyber_sessions WHERE station_id = cs.id AND status = 'active') as active_sessions
                FROM computer_stations cs 
                WHERE cs.is_active = 1 
                ORDER BY cs.name");
            $stations = $stmt->fetchAll();
            sendJSON(['stations' => $stations]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'get_station':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        $id = intval($_GET['id'] ?? 0);
        try {
            $stmt = $pdo->prepare("SELECT cs.* FROM computer_stations cs WHERE cs.id = ?");
            $stmt->execute([$id]);
            $station = $stmt->fetch();
            if (!$station) sendJSON(['error' => 'Estación no encontrada'], 404);
            sendJSON(['station' => $station]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'create_station':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        if (empty($data['name'])) sendJSON(['error' => 'Nombre requerido'], 400);
        
        try {
            $stmt = $pdo->prepare("INSERT INTO computer_stations 
                (name, hostname, ip_address, mac_address, location, specifications, hourly_rate) 
                VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['name'],
                $data['hostname'] ?? null,
                $data['ip_address'] ?? null,
                $data['mac_address'] ?? null,
                $data['location'] ?? null,
                $data['specifications'] ?? null,
                $data['hourly_rate'] ?? 10.00
            ]);
            $id = $pdo->lastInsertId();
            sendJSON(['success' => true, 'id' => $id, 'message' => 'Estación creada']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'update_station':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $id = intval($data['id'] ?? 0);
        if (!$id) sendJSON(['error' => 'ID requerido'], 400);
        
        try {
            $stmt = $pdo->prepare("UPDATE computer_stations SET 
                name = ?, hostname = ?, ip_address = ?, mac_address = ?, mac_address_2 = ?,
                location = ?, specifications = ?, hourly_rate = ?
                WHERE id = ?");
            $stmt->execute([
                $data['name'],
                $data['hostname'] ?? null,
                $data['ip_address'] ?? null,
                $data['mac_address'] ?? null,
                $data['mac_address_2'] ?? null,
                $data['location'] ?? null,
                $data['specifications'] ?? null,
                $data['hourly_rate'] ?? 10.00,
                $id
            ]);
            sendJSON(['success' => true, 'message' => 'Estación actualizada']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'delete_station':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $id = intval($data['id'] ?? 0);
        
        try {
            $stmt = $pdo->prepare("UPDATE computer_stations SET is_active = 0 WHERE id = ?");
            $stmt->execute([$id]);
            sendJSON(['success' => true, 'message' => 'Estación eliminada']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'toggle_station_status':
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $id = intval($data['id'] ?? 0);
        
        try {
            $stmt = $pdo->prepare("UPDATE computer_stations SET 
                status = CASE 
                    WHEN status = 'available' THEN 'maintenance' 
                    WHEN status = 'maintenance' THEN 'available'
                    ELSE status 
                END
                WHERE id = ?");
            $stmt->execute([$id]);
            sendJSON(['success' => true, 'message' => 'Estado actualizado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'start_session':
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $station_id = intval($data['station_id'] ?? 0);
        
        if (!$station_id) sendJSON(['error' => 'Estación requerida'], 400);
        
        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("SELECT * FROM computer_stations WHERE id = ? AND is_active = 1 FOR UPDATE");
            $stmt->execute([$station_id]);
            $station = $stmt->fetch();
            
            if (!$station) {
                $pdo->rollBack();
                sendJSON(['error' => 'Estación no disponible'], 400);
            }
            
            if ($station['status'] !== 'available') {
                $pdo->rollBack();
                sendJSON(['error' => 'La estación no está disponible'], 400);
            }
            
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM cyber_sessions WHERE station_id = ? AND status = 'active'");
            $stmt->execute([$station_id]);
            if ($stmt->fetchColumn() > 0) {
                $pdo->rollBack();
                sendJSON(['error' => 'La estación ya tiene una sesión activa'], 400);
            }
            
            $session_type = $data['session_type'] ?? 'time';
            $amount_paid = floatval($data['amount_paid'] ?? 0);
            $time_minutes = intval($data['time_minutes'] ?? 0);
            $cost_per_minute = $station['hourly_rate'] / 60;
            
            if ($session_type === 'time' && $time_minutes <= 0) {
                $pdo->rollBack();
                sendJSON(['error' => 'Tiempo requerido'], 400);
            }
            
            $total_cost = $session_type === 'time' ? ($time_minutes * $cost_per_minute) : $amount_paid;
            
            $stmt = $pdo->prepare("INSERT INTO cyber_sessions 
                (station_id, customer_name, customer_document, phone, session_type, time_minutes, amount_paid, cost_per_minute, total_cost, payment_method) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $station_id,
                $data['customer_name'] ?? 'Cliente',
                $data['customer_document'] ?? null,
                $data['phone'] ?? null,
                $session_type,
                $time_minutes,
                $amount_paid,
                $cost_per_minute,
                $total_cost,
                $data['payment_method'] ?? 'cash'
            ]);
            $session_id = $pdo->lastInsertId();
            
            $stmt = $pdo->prepare("UPDATE computer_stations SET status = 'occupied' WHERE id = ?");
            $stmt->execute([$station_id]);
            
            $pdo->commit();
            sendJSON([
                'success' => true, 
                'session_id' => $session_id, 
                'total_cost' => $total_cost,
                'message' => 'Sesión iniciada'
            ]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'end_session':
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $session_id = intval($data['session_id'] ?? 0);
        
        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("SELECT cs.*, cs.station_id FROM cyber_sessions cs WHERE cs.id = ? AND cs.status = 'active' FOR UPDATE");
            $stmt->execute([$session_id]);
            $session = $stmt->fetch();
            
            if (!$session) {
                $pdo->rollBack();
                sendJSON(['error' => 'Sesión no encontrada o ya cerrada'], 400);
            }
            
            $end_time = date('Y-m-d H:i:s');
            $start_time = strtotime($session['start_time']);
            $end_ts = strtotime($end_time);
            $time_used_seconds = $end_ts - $start_time;
            $time_used_minutes = ceil($time_used_seconds / 60);
            
            $total_cost = $time_used_minutes * $session['cost_per_minute'];
            
            $stmt = $pdo->prepare("UPDATE cyber_sessions SET 
                end_time = ?, time_used_seconds = ?, total_cost = ?, status = 'completed', closed_by = ?
                WHERE id = ?");
            $stmt->execute([$end_time, $time_used_seconds, $total_cost, $user_id, $session_id]);
            
            $stmt = $pdo->prepare("UPDATE computer_stations SET status = 'available' WHERE id = ?");
            $stmt->execute([$session['station_id']]);
            
            $pdo->commit();
            sendJSON([
                'success' => true, 
                'time_used' => $time_used_minutes,
                'total_cost' => $total_cost,
                'message' => 'Sesión finalizada'
            ]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'pause_session':
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $session_id = intval($data['session_id'] ?? 0);
        
        try {
            $stmt = $pdo->prepare("UPDATE cyber_sessions SET status = 'paused' WHERE id = ? AND status = 'active'");
            $stmt->execute([$session_id]);
            sendJSON(['success' => true, 'message' => 'Sesión pausada']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'resume_session':
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $session_id = intval($data['session_id'] ?? 0);
        
        try {
            $stmt = $pdo->prepare("UPDATE cyber_sessions SET status = 'active' WHERE id = ? AND status = 'paused'");
            $stmt->execute([$session_id]);
            sendJSON(['success' => true, 'message' => 'Sesión reanudada']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'active_sessions':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT cs.*, cs.station_id, cs.start_time, cs.total_cost,
                cs.customer_name, cs.session_type, cs.time_minutes, cs.status,
                s.name as station_name, s.hourly_rate
                FROM cyber_sessions cs 
                JOIN computer_stations s ON cs.station_id = s.id
                WHERE cs.status IN ('active', 'paused') 
                ORDER BY cs.start_time DESC");
            $sessions = $stmt->fetchAll();
            
            foreach ($sessions as &$session) {
                $start = strtotime($session['start_time']);
                $now = time();
                $elapsed = $now - $start;
                $session['elapsed_seconds'] = $elapsed;
                $session['elapsed_formatted'] = floor($elapsed / 60) . ':' . str_pad($elapsed % 60, 2, '0', STR_PAD_LEFT);
            }
            
            sendJSON(['sessions' => $sessions]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'session_history':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $date_from = $_GET['date_from'] ?? date('Y-m-01');
        $date_to = $_GET['date_to'] ?? date('Y-m-d');
        
        try {
            $stmt = $pdo->prepare("SELECT cs.*, s.name as station_name, u.username as closed_by_name
                FROM cyber_sessions cs 
                JOIN computer_stations s ON cs.station_id = s.id
                LEFT JOIN users u ON cs.closed_by = u.id
                WHERE DATE(cs.start_time) BETWEEN ? AND ?
                ORDER BY cs.start_time DESC
                LIMIT 200");
            $stmt->execute([$date_from, $date_to]);
            $sessions = $stmt->fetchAll();
            sendJSON(['sessions' => $sessions]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'list_services':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT * FROM services WHERE is_active = 1 ORDER BY category, name");
            $services = $stmt->fetchAll();
            sendJSON(['services' => $services]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'create_service':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        if (empty($data['name'])) sendJSON(['error' => 'Nombre requerido'], 400);
        
        try {
            $stmt = $pdo->prepare("INSERT INTO services (name, description, category, price, duration_minutes) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['name'],
                $data['description'] ?? null,
                $data['category'] ?? null,
                $data['price'] ?? 0,
                $data['duration_minutes'] ?? null
            ]);
            sendJSON(['success' => true, 'id' => $pdo->lastInsertId(), 'message' => 'Servicio creado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'record_service':
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        
        if (empty($data['service_id'])) sendJSON(['error' => 'Servicio requerido'], 400);
        
        try {
            $stmt = $pdo->prepare("SELECT * FROM services WHERE id = ? AND is_active = 1");
            $stmt->execute([$data['service_id']]);
            $service = $stmt->fetch();
            if (!$service) sendJSON(['error' => 'Servicio no encontrado'], 404);
            
            $qty = intval($data['quantity'] ?? 1);
            $unit_price = floatval($data['unit_price'] ?? $service['price']);
            $total_price = $qty * $unit_price;
            
            $stmt = $pdo->prepare("INSERT INTO service_transactions 
                (service_id, customer_name, quantity, unit_price, total_price, payment_method, notes, user_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['service_id'],
                $data['customer_name'] ?? null,
                $qty,
                $unit_price,
                $total_price,
                $data['payment_method'] ?? 'cash',
                $data['notes'] ?? null,
                $user_id
            ]);
            
            sendJSON(['success' => true, 'id' => $pdo->lastInsertId(), 'total' => $total_price, 'message' => 'Servicio registrado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'service_history':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $date_from = $_GET['date_from'] ?? date('Y-m-01');
        $date_to = $_GET['date_to'] ?? date('Y-m-d');
        
        try {
            $stmt = $pdo->prepare("SELECT st.*, s.name as service_name, s.category, u.username as user_name
                FROM service_transactions st
                JOIN services s ON st.service_id = s.id
                LEFT JOIN users u ON st.user_id = u.id
                WHERE DATE(st.created_at) BETWEEN ? AND ?
                ORDER BY st.created_at DESC
                LIMIT 200");
            $stmt->execute([$date_from, $date_to]);
            $transactions = $stmt->fetchAll();
            sendJSON(['transactions' => $transactions]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'add_print_job':
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        
        try {
            $pages = intval($data['pages'] ?? 1);
            $copies = intval($data['copies'] ?? 1);
            $total_pages = $pages * $copies;
            $price_per_page = floatval($data['price_per_page'] ?? 1.00);
            $total_price = $total_pages * $price_per_page;
            
            $stmt = $pdo->prepare("INSERT INTO print_jobs 
                (station_id, customer_name, document_name, pages, copies, price_per_page, total_price, user_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['station_id'] ?? null,
                $data['customer_name'] ?? null,
                $data['document_name'] ?? 'Documento',
                $pages,
                $copies,
                $price_per_page,
                $total_price,
                $user_id
            ]);
            
            sendJSON(['success' => true, 'id' => $pdo->lastInsertId(), 'total' => $total_price, 'message' => 'Trabajo agregado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'pending_prints':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query("SELECT pj.*, cs.name as station_name, u.username as user_name
                FROM print_jobs pj
                LEFT JOIN computer_stations cs ON pj.station_id = cs.id
                LEFT JOIN users u ON pj.user_id = u.id
                WHERE pj.status = 'pending'
                ORDER BY pj.created_at ASC");
            $jobs = $stmt->fetchAll();
            sendJSON(['jobs' => $jobs]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'complete_print':
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $job_id = intval($data['id'] ?? 0);
        
        try {
            $stmt = $pdo->prepare("UPDATE print_jobs SET status = 'completed' WHERE id = ? AND status = 'pending'");
            $stmt->execute([$job_id]);
            sendJSON(['success' => true, 'message' => 'Impresión completada']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    default:
        sendJSON(['error' => 'Acción no válida'], 400);
}
?>
