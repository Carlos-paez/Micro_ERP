<?php
// api/categories.php
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
            $stmt = $pdo->query("SELECT c.*, 
                (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count,
                pc.name as parent_name
                FROM categories c 
                LEFT JOIN categories pc ON c.parent_id = pc.id
                ORDER BY c.name");
            $categories = $stmt->fetchAll();
            sendJSON(['categories' => $categories]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'get':
        if (!isAuthenticated()) sendJSON(['error' => 'Unauthorized'], 403);
        $id = intval($_GET['id'] ?? 0);
        try {
            $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            $category = $stmt->fetch();
            if (!$category) sendJSON(['error' => 'Categoría no encontrada'], 404);
            sendJSON(['category' => $category]);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'create':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        if (empty($data['name'])) sendJSON(['error' => 'Nombre requerido'], 400);
        try {
            $stmt = $pdo->prepare("INSERT INTO categories (name, description, parent_id) VALUES (?, ?, ?)");
            $stmt->execute([
                $data['name'],
                $data['description'] ?? null,
                $data['parent_id'] ?? null
            ]);
            $id = $pdo->lastInsertId();
            sendJSON(['success' => true, 'id' => $id, 'message' => 'Categoría creada']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'update':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $id = intval($data['id'] ?? 0);
        if (!$id) sendJSON(['error' => 'ID requerido'], 400);
        try {
            $stmt = $pdo->prepare("UPDATE categories SET name = ?, description = ?, parent_id = ? WHERE id = ?");
            $stmt->execute([
                $data['name'],
                $data['description'] ?? null,
                $data['parent_id'] ?? null,
                $id
            ]);
            sendJSON(['success' => true, 'message' => 'Categoría actualizada']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    case 'delete':
        if (!isAdmin()) sendJSON(['error' => 'Unauthorized'], 403);
        $data = getJSONInput();
        $id = intval($data['id'] ?? 0);
        if (!$id) sendJSON(['error' => 'ID requerido'], 400);
        try {
            $stmt = $pdo->prepare("UPDATE products SET category_id = NULL WHERE category_id = ?");
            $stmt->execute([$id]);
            $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            sendJSON(['success' => true, 'message' => 'Categoría eliminada']);
        } catch (PDOException $e) {
            sendJSON(['error' => $e->getMessage()], 500);
        }
        break;

    default:
        sendJSON(['error' => 'Acción no válida'], 400);
}
?>
