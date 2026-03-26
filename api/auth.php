<?php
// api/auth.php - Enhanced Authentication
session_start();
require_once 'db.php';

function sendJSON($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'register') {
    $input = getJSONInput();
    $username = trim($input['username'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $full_name = trim($input['full_name'] ?? '');
    $role = $input['role'] ?? 'operator';

    if (empty($username) || empty($password)) {
        sendJSON(['error' => 'Usuario y contraseña son requeridos'], 400);
    }

    if (!in_array($role, ['admin', 'provider', 'operator'])) {
        $role = 'operator';
    }

    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? OR email = ?');
    $stmt->execute([$username, $email]);
    if ($stmt->fetch()) {
        sendJSON(['error' => 'El usuario o email ya existe'], 400);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    try {
        $stmt = $pdo->prepare('INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$username, $email ?: null, $passwordHash, $full_name ?: null, $role]);
        sendJSON(['success' => true, 'message' => 'Usuario creado exitosamente']);
    } catch (PDOException $e) {
        sendJSON(['error' => 'Error al crear el usuario'], 500);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $input = getJSONInput();
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        sendJSON(['error' => 'Usuario y contraseña requeridos'], 400);
    }

    $stmt = $pdo->prepare('SELECT id, username, email, full_name, password_hash, role, is_active FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && $user['is_active'] && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['full_name'] = $user['full_name'];
        
        sendJSON([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    } else {
        sendJSON(['error' => 'Credenciales inválidas'], 401);
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
                'full_name' => $_SESSION['full_name'] ?? null,
                'role' => $_SESSION['role']
            ]
        ]);
    } else {
        sendJSON(['authenticated' => false], 401);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'users' && $_SESSION['role'] === 'admin') {
    try {
        $stmt = $pdo->query('SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC');
        $users = $stmt->fetchAll();
        sendJSON(['users' => $users]);
    } catch (PDOException $e) {
        sendJSON(['error' => $e->getMessage()], 500);
    }

} else {
    sendJSON(['error' => 'Acción no válida'], 400);
}
?>
