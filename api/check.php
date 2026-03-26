<?php
require 'db.php';
try {
    $pdo->query('SELECT hourly_rate FROM equipment LIMIT 1');
    echo 'COLUMN_EXISTS';
} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage();
}
?>
