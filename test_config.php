<?php
// test_config.php - Diagnóstico de conexión
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>Diagnóstico de Configuración</h2>";

echo "<h3>1. PHP Version</h3>";
echo phpversion() . "<br>";

echo "<h3>2. PDO MySQL Extension</h3>";
echo extension_loaded('pdo_mysql') ? 'Enabled' : 'Disabled';

echo "<h3>3. Testing Database Connection</h3>";

$host = 'localhost';
$db   = 'micro_erp';
$user = 'root';
$pass = '';
$port = '3306';

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    echo "✓ Conexión exitosa a la base de datos<br>";
    
    // Test query
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✓ Usuarios en la base de datos: " . $result['count'] . "<br>";
    
    // Check tables
    $tables = ['users', 'products', 'categories', 'suppliers', 'equipment', 'computer_stations'];
    echo "<h3>4. Tablas existentes</h3>";
    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM $table");
            $count = $stmt->fetchColumn();
            echo "✓ $table: $count registros<br>";
        } catch (PDOException $e) {
            echo "✗ $table: No existe o error - " . $e->getMessage() . "<br>";
        }
    }
    
} catch (PDOException $e) {
    echo "✗ Error de conexión: " . $e->getMessage() . "<br>";
    echo "<h3>Pasos para resolver:</h3>";
    echo "<ol>";
    echo "<li>Asegúrate de que MySQL esté corriendo (XAMPP/WAMP)</li>";
    echo "<li>Crea la base de datos: <code>CREATE DATABASE micro_erp;</code></li>";
    echo "<li>Importa el archivo <code>init.sql</code></li>";
    echo "</ol>";
}

echo "<h3>5. API Test</h3>";
echo '<a href="api/db.php">Probar api/db.php</a> (debería devolver JSON)';
?>
