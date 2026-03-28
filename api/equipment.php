<?php
// api/equipment.php
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

$action = $_GET['action'] ?? '';

switch($action) {
    case 'list':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query('SELECT * FROM equipment ORDER BY name ASC');
            sendJSON(['equipment' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;
        
    case 'active_loans':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        try {
            $stmt = $pdo->query('
                SELECT el.*, e.name as equipment_name 
                FROM equipment_loans el
                JOIN equipment e ON el.equipment_id = e.id
                WHERE el.status = \'active\'
                ORDER BY el.start_time ASC
            ');
            sendJSON(['loans' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;
        
    case 'start_loan':
        $input = getJSONInput();
        $equipmentId = $input['equipment_id'] ?? 0;
        $customerName = $input['customer_name'] ?? '';
        $customerPhone = $input['customer_phone'] ?? '';
        $customerDoc = $input['customer_document'] ?? '';

        if ($equipmentId <= 0 || empty($customerName)) {
            sendJSON(['error' => 'Datos inválidos'], 400);
        }

        $pdo->beginTransaction();
        try {
            $stmtCheck = $pdo->prepare('SELECT status FROM equipment WHERE id = ? FOR UPDATE');
            $stmtCheck->execute([$equipmentId]);
            $currentStatus = $stmtCheck->fetchColumn();

            if ($currentStatus !== 'available') {
                $pdo->rollBack();
                sendJSON(['error' => 'El equipo no está disponible'], 400);
            }

            $stmtLoan = $pdo->prepare('
                INSERT INTO equipment_loans (equipment_id, customer_name, customer_phone, customer_document, status) 
                VALUES (?, ?, ?, ?, \'active\')
            ');
            $stmtLoan->execute([$equipmentId, $customerName, $customerPhone, $customerDoc]);

            $stmtEq = $pdo->prepare('UPDATE equipment SET status = \'in_use\' WHERE id = ?');
            $stmtEq->execute([$equipmentId]);

            $pdo->commit();
            sendJSON(['success' => true, 'message' => 'Préstamo registrado']);

        } catch (Exception $e) {
            $pdo->rollBack();
            sendJSON(['error' => 'Error al iniciar préstamo: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'return_equipment':
        $input = getJSONInput();
        $loanId = $input['loan_id'] ?? 0;

        if ($loanId <= 0) {
            sendJSON(['error' => 'ID de préstamo inválido'], 400);
        }

        $pdo->beginTransaction();
        try {
            $stmtGet = $pdo->prepare('SELECT equipment_id, status FROM equipment_loans WHERE id = ? FOR UPDATE');
            $stmtGet->execute([$loanId]);
            $loan = $stmtGet->fetch();

            if (!$loan || $loan['status'] !== 'active') {
                $pdo->rollBack();
                sendJSON(['error' => 'El préstamo no está activo o no se encontró'], 400);
            }

            $stmtUpdateLoan = $pdo->prepare('UPDATE equipment_loans SET status = \'completed\', actual_end_time = CURRENT_TIMESTAMP WHERE id = ?');
            $stmtUpdateLoan->execute([$loanId]);

            $stmtUpdateEq = $pdo->prepare('UPDATE equipment SET status = \'available\' WHERE id = ?');
            $stmtUpdateEq->execute([$loan['equipment_id']]);

            $pdo->commit();
            sendJSON(['success' => true, 'message' => 'Equipo devuelto correctamente']);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendJSON(['error' => 'Error al devolver equipo: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'add_equipment':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        
        $input = getJSONInput();
        $name = $input['name'] ?? '';
        $description = $input['description'] ?? '';

        if (empty($name)) {
            sendJSON(['error' => 'El nombre del equipo es obligatorio'], 400);
        }

        try {
            $stmt = $pdo->prepare('INSERT INTO equipment (name, description, status) VALUES (?, ?, \'available\')');
            $stmt->execute([$name, $description]);
            sendJSON(['success' => true, 'id' => $pdo->lastInsertId(), 'message' => 'Equipo agregado']);
        } catch (Exception $e) {
            sendJSON(['error' => 'Error al agregar equipo: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'toggle_status':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        
        $input = getJSONInput();
        $equipmentId = $input['equipment_id'] ?? 0;
        $newStatus = $input['status'] ?? '';

        if ($equipmentId <= 0 || !in_array($newStatus, ['available', 'maintenance'])) {
            sendJSON(['error' => 'Datos inválidos'], 400);
        }

        try {
            $stmtCheck = $pdo->prepare('SELECT status FROM equipment WHERE id = ?');
            $stmtCheck->execute([$equipmentId]);
            $currentStatus = $stmtCheck->fetchColumn();

            if ($currentStatus === 'in_use') {
                sendJSON(['error' => 'No se puede cambiar el estado de un equipo en uso'], 400);
            }

            $stmtUpdate = $pdo->prepare('UPDATE equipment SET status = ? WHERE id = ?');
            $stmtUpdate->execute([$newStatus, $equipmentId]);
            sendJSON(['success' => true, 'message' => 'Estado actualizado']);
        } catch (Exception $e) {
            sendJSON(['error' => 'Error al actualizar estado: ' . $e->getMessage()], 500);
        }
        break;
        
    default:
        sendJSON(['error' => 'Acción no válida'], 400);
}
?>
