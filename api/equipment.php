<?php
// api/equipment.php
session_start();
require_once 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    sendJSON(['error' => 'Unauthorized'], 403);
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list') {
        $stmt = $pdo->query('SELECT * FROM equipment ORDER BY name ASC');
        sendJSON(['equipment' => $stmt->fetchAll()]);
    } elseif ($action === 'active_loans') {
        $stmt = $pdo->query('
            SELECT el.*, e.name as equipment_name 
            FROM equipment_loans el
            JOIN equipment e ON el.equipment_id = e.id
            WHERE el.status = \'active\'
            ORDER BY el.end_time ASC
        ');
        sendJSON(['loans' => $stmt->fetchAll()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJSONInput();

    if ($action === 'start_loan') {
        $equipmentId = $input['equipment_id'] ?? 0;
        $customerName = $input['customer_name'] ?? '';
        $durationMinutes = $input['duration_minutes'] ?? 0;

        if ($equipmentId <= 0 || empty($customerName) || $durationMinutes <= 0) {
            sendJSON(['error' => 'Invalid data'], 400);
        }

        $pdo->beginTransaction();
        try {
            // Check status
            $stmtCheck = $pdo->prepare('SELECT status FROM equipment WHERE id = ? FOR UPDATE');
            $stmtCheck->execute([$equipmentId]);
            $status = $stmtCheck->fetchColumn();

            if ($status !== 'available') {
                $pdo->rollBack();
                sendJSON(['error' => 'Equipment is not available'], 400);
            }

            // Calculate end time
            $endTime = date('Y-m-d H:i:s', strtotime("+$durationMinutes minutes"));

            // Insert loan
            $stmtLoan = $pdo->prepare('
                INSERT INTO equipment_loans (equipment_id, customer_name, duration_minutes, end_time, status) 
                VALUES (?, ?, ?, ?, ?) RETURNING id
            ');
            $stmtLoan->execute([$equipmentId, $customerName, $durationMinutes, $endTime, 'active']);
            $loanId = $stmtLoan->fetchColumn();

            // Update equipment status
            $stmtEq = $pdo->prepare('UPDATE equipment SET status = \'in_use\' WHERE id = ?');
            $stmtEq->execute([$equipmentId]);

            $pdo->commit();
            sendJSON(['success' => true, 'loan_id' => $loanId, 'end_time' => $endTime]);

        } catch (\Exception $e) {
            $pdo->rollBack();
            sendJSON(['error' => 'Failed to start loan'], 500);
        }
    } elseif ($action === 'return_equipment') {
        $loanId = $input['loan_id'] ?? 0;

        if ($loanId <= 0) {
             sendJSON(['error' => 'Invalid loan ID'], 400);
        }

        $pdo->beginTransaction();
        try {
            // Get loan info
            $stmtGet = $pdo->prepare('SELECT equipment_id, status FROM equipment_loans WHERE id = ? FOR UPDATE');
            $stmtGet->execute([$loanId]);
            $loan = $stmtGet->fetch();

            if (!$loan || $loan['status'] !== 'active') {
                $pdo->rollBack();
                sendJSON(['error' => 'Loan is not active or not found'], 400);
            }

            // Complete loan
            $stmtUpdateLoan = $pdo->prepare('UPDATE equipment_loans SET status = \'completed\' WHERE id = ?');
            $stmtUpdateLoan->execute([$loanId]);

            // Release equipment
            $stmtUpdateEq = $pdo->prepare('UPDATE equipment SET status = \'available\' WHERE id = ?');
            $stmtUpdateEq->execute([$loan['equipment_id']]);

            $pdo->commit();
            sendJSON(['success' => true]);
        } catch (\Exception $e) {
            $pdo->rollBack();
             sendJSON(['error' => 'Failed to return equipment'], 500);
        }
    } elseif ($action === 'add_equipment') {
        $name = $input['name'] ?? '';
        $description = $input['description'] ?? '';

        if (empty($name)) {
            sendJSON(['error' => 'El nombre del equipo es obligatorio'], 400);
        }

        try {
            $stmt = $pdo->prepare('INSERT INTO equipment (name, description, status) VALUES (?, ?, \'available\') RETURNING id');
            $stmt->execute([$name, $description]);
            sendJSON(['success' => true, 'id' => $stmt->fetchColumn()]);
        } catch (\Exception $e) {
            sendJSON(['error' => 'Error al agregar equipo: ' . $e->getMessage()], 500);
        }
    } elseif ($action === 'toggle_status') {
        $equipmentId = $input['equipment_id'] ?? 0;
        $newStatus = $input['status'] ?? '';

        if ($equipmentId <= 0 || !in_array($newStatus, ['available', 'maintenance'])) {
            sendJSON(['error' => 'Datos inválidos'], 400);
        }

        // We should ensure the equipment is not currently "in_use" before allowing a toggle.
        try {
            $stmtCheck = $pdo->prepare('SELECT status FROM equipment WHERE id = ?');
            $stmtCheck->execute([$equipmentId]);
            $currentStatus = $stmtCheck->fetchColumn();

            if ($currentStatus === 'in_use') {
                sendJSON(['error' => 'No se puede cambiar el estado de un equipo en uso'], 400);
            }

            $stmtUpdate = $pdo->prepare('UPDATE equipment SET status = ? WHERE id = ?');
            $stmtUpdate->execute([$newStatus, $equipmentId]);
            sendJSON(['success' => true]);
        } catch (\Exception $e) {
            sendJSON(['error' => 'Error al actualizar estado: ' . $e->getMessage()], 500);
        }
    }
}

sendJSON(['error' => 'Invalid action'], 400);
?>
