<?php
// api/fix_schema.php
require_once 'db.php';

header('Content-Type: text/plain; charset=utf-8');

$log = "Starting schema diagnostic and fix...\n";

try {
    // 1. Get current columns
    $stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'equipment_loans'");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $log .= "Current columns in 'equipment_loans': " . implode(", ", $columns) . "\n";

    // 2. Add 'actual_end_time' if missing
    if (!in_array('actual_end_time', $columns)) {
        $log .= "Adding missing column 'actual_end_time'...\n";
        $pdo->exec("ALTER TABLE equipment_loans ADD COLUMN actual_end_time TIMESTAMP;");
        $log .= "Column 'actual_end_time' added.\n";
    }

    // 3. Make duration_minutes nullable (if exists)
    if (in_array('duration_minutes', $columns)) {
        $pdo->exec("ALTER TABLE equipment_loans ALTER COLUMN duration_minutes DROP NOT NULL;");
        $log .= "Column 'duration_minutes' is now nullable.\n";
    }

    // 4. Ensure other columns are nullable if they exist
    $colsToFix = ['session_type', 'total_amount', 'end_time'];
    foreach ($colsToFix as $col) {
        if (in_array($col, $columns)) {
            $pdo->exec("ALTER TABLE equipment_loans ALTER COLUMN $col DROP NOT NULL;");
            $log .= "Column '$col' is now nullable.\n";
        }
    }

    $log .= "Schema diagnostic and fix completed successfully!\n";
} catch (\Exception $e) {
    $log .= "Fix failed: " . $e->getMessage() . "\n";
}

file_put_contents('fix_log.txt', $log);
echo $log;
?>