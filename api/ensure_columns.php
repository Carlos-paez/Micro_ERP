<?php
// api/ensure_columns.php
require_once 'db.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    echo "Starting schema update...\n";

    // 1. Check if 'actual_end_time' exists in 'equipment_loans'
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = 'equipment_loans' AND column_name = 'actual_end_time'
    ");
    $exists = $stmt->fetchColumn() > 0;

    if (!$exists) {
        echo "Adding 'actual_end_time' column to 'equipment_loans'...\n";
        $pdo->exec("ALTER TABLE equipment_loans ADD COLUMN actual_end_time TIMESTAMP;");
        echo "Column 'actual_end_time' added successfully.\n";
    } else {
        echo "Column 'actual_end_time' already exists.\n";
    }

    // 2. Also ensure 'duration_minutes' is nullable if it exists
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = 'equipment_loans' AND column_name = 'duration_minutes'
    ");
    $durationExists = $stmt->fetchColumn() > 0;
    if ($durationExists) {
        $pdo->exec("ALTER TABLE equipment_loans ALTER COLUMN duration_minutes DROP NOT NULL;");
        echo "Column 'duration_minutes' made nullable.\n";
    }

    echo "Schema update completed successfully!\n";
} catch (\Exception $e) {
    echo "Error updating schema: " . $e->getMessage() . "\n";
}
?>