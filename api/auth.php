<?php
// api/auth.php
session_start();
require_once 'db.php';

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'register') {
    $input = getJSONInput();
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    $role = $input['role'] ?? 'provider'; // default to provider if not admin

    if (empty($username) || empty($password)) {
        sendJSON(['error' => 'Usuario y contraseña son requeridos'], 400);
    }
    
    if (!in_array($role, ['admin', 'provider'])) {
        sendJSON(['error' => 'Rol inválido'], 400);
    }

    // Check if user exists
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        sendJSON(['error' => 'El usuario ya existe'], 400);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmtInsert = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    
    try {
        $stmtInsert->execute([$username, $passwordHash, $role]);
        sendJSON(['success' => true]);
    } catch (\Exception $e) {
        sendJSON(['error' => 'Error al crear el usuario'], 500);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $input = getJSONInput();
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        sendJSON(['error' => 'Username and password are required'], 400);
    }

    $stmt = $pdo->prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        
        sendJSON([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role']
            ]
        ]);
    } else {
        sendJSON(['error' => 'Invalid credentials'], 401);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'logout') {
    session_destroy();
    sendJSON(['success' => true]);
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'session') {
    if (isset($_SESSION['user_id'])) {
        sendJSON([
            'authenticated' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'role' => $_SESSION['role']
            ]
        ]);
    } else {
        sendJSON(['authenticated' => false], 401);
    }
} else {
    sendJSON(['error' => 'Invalid action'], 400);
}
?>
