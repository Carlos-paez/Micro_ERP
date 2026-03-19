<?php
// api/verify.php
require_once 'db.php';

function checkTable($pdo, $table) {
    try {
        $stmt = $pdo->query("SELECT * FROM information_schema.tables WHERE table_name = '$table'");
        return $stmt->rowCount() > 0;
    } catch (Exception $e) {
        return false;
    }
}

function checkColumn($pdo, $table, $column) {
    try {
        $stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = '$table' AND column_name = '$column'");
        return $stmt->rowCount() > 0;
    } catch (Exception $e) {
        return false;
    }
}

try {
    $tables = ['users', 'products', 'equipment', 'equipment_loans'];
    foreach ($tables as $table) {
        echo "Table '$table' exists: " . (checkTable($pdo, $table) ? 'YES' : 'NO') . "\n";
    }
    
    echo "Column 'hourly_rate' in 'equipment': " . (checkColumn($pdo, 'equipment', 'hourly_rate') ? 'YES' : 'NO') . "\n";
    echo "Column 'session_type' in 'equipment_loans': " . (checkColumn($pdo, 'equipment_loans', 'session_type') ? 'YES' : 'NO') . "\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
