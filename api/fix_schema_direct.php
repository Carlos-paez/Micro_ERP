<?php
// fix_schema_direct.php
$host = 'ep-purple-shape-ade5xlqb-pooler.c-2.us-east-1.aws.neon.tech';
$db   = 'neondb';
$user = 'neondb_owner';
$pass = 'npg_Kgr69nALtPDE';
$port = '5432';

$dsn = "pgsql:host=$host;port=$port;dbname=$db";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "Connected successfully.\n";

    // 1. Get current columns
    $stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'equipment_loans'");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Current columns: " . implode(", ", $columns) . "\n";

    // 2. Add 'actual_end_time' if missing
    if (!in_array('actual_end_time', $columns)) {
        echo "Adding 'actual_end_time'...\n";
        $pdo->exec("ALTER TABLE equipment_loans ADD COLUMN actual_end_time TIMESTAMP;");
        echo "Added 'actual_end_time'.\n";
    }

    // 3. Make columns nullable
    $colsToFix = ['duration_minutes', 'session_type', 'total_amount', 'end_time'];
    foreach ($colsToFix as $col) {
        if (in_array($col, $columns)) {
            $pdo->exec("ALTER TABLE equipment_loans ALTER COLUMN $col DROP NOT NULL;");
            echo "Column '$col' is now nullable.\n";
        }
    }

    echo "Fix completed!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>