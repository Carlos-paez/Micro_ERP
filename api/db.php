<?php
// db.php - Database Connection Configuration

$host = getenv('DB_HOST') ?: 'ep-purple-shape-ade5xlqb-pooler.c-2.us-east-1.aws.neon.tech';
$db   = getenv('DB_NAME') ?: 'neondb';
$user = getenv('DB_USER') ?: 'neondb_owner';
$pass = getenv('DB_PASS') ?: 'npg_Kgr69nALtPDE';
$port = getenv('DB_PORT') ?: '5432';

$dsn = "pgsql:host=$host;port=$port;dbname=$db";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on errors
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch associative arrays
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Use real prepared statements
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // In production, log the error rather than displaying it
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Utility function for sending JSON responses
function sendJSON($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

// Utility function to get JSON input from request body
function getJSONInput() {
    $json = file_get_contents('php://input');
    return json_decode($json, true);
}
?>
