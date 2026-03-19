<?php
// api/direct_migrate.php
$dsn = "pgsql:host=ep-purple-shape-ade5xlqb-pooler.c-2.us-east-1.aws.neon.tech;port=5432;dbname=neondb";
$user = 'neondb_owner';
$pass = 'npg_Kgr69nALtPDE';

try {
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "CONNECTED\n";
    
    // Create ENUM
    $pdo->exec("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN CREATE TYPE session_type AS ENUM ('prepaid', 'postpaid'); END IF; END $$;");
    echo "ENUM OK\n";
    
    // Add columns
    $pdo->exec("ALTER TABLE equipment ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 2.00;");
    echo "COLUMN equipment.hourly_rate OK\n";
    
    $pdo->exec("ALTER TABLE equipment_loans ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMP;");
    $pdo->exec("ALTER TABLE equipment_loans ADD COLUMN IF NOT EXISTS session_type session_type NOT NULL DEFAULT 'prepaid';");
    $pdo->exec("ALTER TABLE equipment_loans ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0.00;");
    echo "COLUMNS equipment_loans OK\n";
    
    echo "MIGRATION SUCCESS\n";
} catch (Exception $e) {
    echo "MIGRATION FAILED: " . $e->getMessage() . "\n";
}
?>
