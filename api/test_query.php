<?php
// api/test_query.php
require_once 'db.php';

try {
    $stmt = $pdo->query('SELECT id, name, hourly_rate FROM equipment LIMIT 1');
    $row = $stmt->fetch();
    echo "Query success: " . json_encode($row) . "\n";
} catch (\Exception $e) {
    echo "Query failed: " . $e->getMessage() . "\n";
}
?>
