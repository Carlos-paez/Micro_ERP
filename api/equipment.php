<?php
// api/equipment.php - Enhanced Equipment Management
session_start();
require_once 'db.php';

function isAdmin() {
    return isset($_SESSION['user_id']) && $_SESSION['role'] === 'admin';
}

function isOperator() {
    return isset($_SESSION['user_id']) && in_array($_SESSION['role'], ['admin', 'operator']);
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

if (!isAuthenticated()) {
    sendJSON(['error' => 'Unauthorized'], 403);
}

$action = $_GET['action'] ?? '';
$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list') {
        $stmt = $pdo->query('SELECT * FROM equipment ORDER BY name ASC');
        sendJSON(['equipment' => $stmt->fetchAll()]);
        
    } elseif ($action === 'active_loans') {
        $stmt = $pdo->query('
            SELECT el.*, e.name as equipment_name, e.hourly_rate
            FROM equipment_loans el
            JOIN equipment e ON el.equipment_id = e.id
            WHERE el.status = "active"
            ORDER BY el.start_time ASC
        ');
        sendJSON(['loans' => $stmt->fetchAll()]);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJSONInput();

    if ($action === 'start_loan') {
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        
        $equipmentId = intval($input['equipment_id'] ?? 0);
        $customerName = trim($input['customer_name'] ?? '');

        if ($equipmentId <= 0 || empty($customerName)) {
            sendJSON(['error' => 'Datos requeridos'], 400);
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('SELECT status, hourly_rate FROM equipment WHERE id = ? FOR UPDATE');
            $stmt->execute([$equipmentId]);
            $equipment = $stmt->fetch();

            if (!$equipment || $equipment['status'] !== 'available') {
                $pdo->rollBack();
                sendJSON(['error' => 'El equipo no está disponible'], 400);
            }

            $stmt = $pdo->prepare('INSERT INTO equipment_loans 
                (equipment_id, customer_name, customer_phone, customer_document, hourly_rate, status, created_by) 
                VALUES (?, ?, ?, ?, ?, "active", ?)');
            $stmt->execute([
                $equipmentId,
                $customerName,
                $input['customer_phone'] ?? null,
                $input['customer_document'] ?? null,
                $equipment['hourly_rate'],
                $user_id
            ]);

            $stmt = $pdo->prepare('UPDATE equipment SET status = "in_use" WHERE id = ?');
            $stmt->execute([$equipmentId]);

            $pdo->commit();
            sendJSON(['success' => true, 'message' => 'Préstamo iniciado']);

        } catch (PDOException $e) {
            $pdo->rollBack();
            sendJSON(['error' => $e->getMessage()], 500);
        }

    } elseif ($action === 'return_equipment') {
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        
        $loanId = intval($input['loan_id'] ?? 0);
        if ($loanId <= 0) sendJSON(['error' => 'ID inválido'], 400);

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('SELECT equipment_id, status, start_time, hourly_rate FROM equipment_loans WHERE id = ? FOR UPDATE');
            $stmt->execute([$loanId]);
            $loan = $stmt->fetch();

            if (!$loan || $loan['status'] !== 'active') {
                $pdo->rollBack();
                sendJSON(['error' => 'Préstamo no encontrado o ya cerrado'], 400);
            }

            $startTime = strtotime($loan['start_time']);
            $endTime = time();
            $hours = ($endTime - $startTime) / 3600;
            $totalAmount = $hours * floatval($loan['hourly_rate']);

            $stmt = $pdo->prepare('UPDATE equipment_loans SET 
                status = "completed", 
                actual_end_time = NOW(),
                total_hours = ?,
                total_amount = ?,
                closed_by = ?
                WHERE id = ?');
            $stmt->execute([round($hours, 2), round($totalAmount, 2), $user_id, $loanId]);

            $stmt = $pdo->prepare('UPDATE equipment SET status = "available" WHERE id = ?');
            $stmt->execute([$loan['equipment_id']]);

            $pdo->commit();
            sendJSON(['success' => true, 'message' => 'Equipo devuelto', 'hours' => round($hours, 2), 'total' => round($totalAmount, 2)]);

        } catch (PDOException $e) {
            $pdo->rollBack();
            sendJSON(['error' => $e->getMessage()], 500);
        }

    } elseif ($action === 'add_equipment') {
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        
        $name = trim($input['name'] ?? '');
        if (empty($name)) sendJSON(['error' => 'Nombre requerido'], 400);

        try {
            $stmt = $pdo->prepare('INSERT INTO equipment 
                (name, description, serial_number, category, purchase_date, warranty_expiry, hourly_rate, location, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, "available")');
            $stmt->execute([
                $name,
                $input['description'] ?? null,
                $input['serial_number'] ?? null,
                $input['category'] ?? null,
                $input['purchase_date'] ?? null,
                $input['warranty_expiry'] ?? null,
                floatval($input['hourly_rate'] ?? 10),
                $input['location'] ?? null
            ]);
            sendJSON(['success' => true, 'id' => $pdo->lastInsertId(), 'message' => 'Equipo creado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }

    } elseif ($action === 'toggle_status') {
        if (!isOperator()) sendJSON(['error' => 'Unauthorized'], 403);
        
        $equipmentId = intval($input['equipment_id'] ?? 0);
        $newStatus = $input['status'] ?? '';
        $validStatuses = ['available', 'maintenance', 'cleaning'];

        if ($equipmentId <= 0 || !in_array($newStatus, $validStatuses)) {
            sendJSON(['error' => 'Datos inválidos'], 400);
        }

        try {
            $stmt = $pdo->prepare('SELECT status FROM equipment WHERE id = ?');
            $stmt->execute([$equipmentId]);
            $current = $stmt->fetchColumn();

            if ($current === 'in_use') {
                sendJSON(['error' => 'No se puede cambiar estado de equipo en uso'], 400);
            }

            $stmt = $pdo->prepare('UPDATE equipment SET status = ? WHERE id = ?');
            $stmt->execute([$newStatus, $equipmentId]);
            sendJSON(['success' => true, 'message' => 'Estado actualizado']);

        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }

    } elseif ($action === 'delete_equipment') {
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        
        $equipmentId = intval($input['equipment_id'] ?? 0);
        
        try {
            $stmt = $pdo->prepare('UPDATE equipment SET status = "retired" WHERE id = ?');
            $stmt->execute([$equipmentId]);
            sendJSON(['success' => true, 'message' => 'Equipo retirado']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
    }
}

sendJSON(['error' => 'Acción inválida'], 400);
?>
