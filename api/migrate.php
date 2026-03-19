<?php
// api/migrate.php
require_once 'db.php';

// Simple authentication (optional, but good for safety)
// In a real app, you'd check for admin role, but here we'll just run it.

header('Content-Type: text/plain; charset=utf-8');

try {
    echo "Starting migration...\n";

    // 1. Create session_type ENUM if it doesn't exist
    $pdo->exec("
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN
                CREATE TYPE session_type AS ENUM ('prepaid', 'postpaid');
            END IF;
        END $$;
    ");
    echo "ENUM 'session_type' verified/created.\n";

    // 2. Add hourly_rate to equipment
    $pdo->exec("
        ALTER TABLE equipment 
        ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 2.00;
    ");
    echo "Column 'hourly_rate' verified/added to 'equipment'.\n";

    // 3. Add columns to equipment_loans
    $pdo->exec("
        ALTER TABLE equipment_loans 
        ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMP,
        ADD COLUMN IF NOT EXISTS session_type session_type NOT NULL DEFAULT 'prepaid',
        ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0.00;
    ");
    echo "Columns 'actual_end_time', 'session_type', 'total_amount' verified/added to 'equipment_loans'.\n";

    echo "Migration completed successfully!\n";
} catch (\Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
?>
