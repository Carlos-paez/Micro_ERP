-- Database initialization for ERP Application

-- Create ENUMs for status and roles to ensure data integrity
CREATE TYPE user_role AS ENUM ('admin', 'provider');
CREATE TYPE transaction_type AS ENUM ('in', 'out');
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE equipment_status AS ENUM ('available', 'in_use', 'maintenance', 'cleaning');
CREATE TYPE loan_status AS ENUM ('active', 'completed', 'overdue');
CREATE TYPE session_type AS ENUM ('prepaid', 'postpaid');

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: In production you should properly hash passwords!
-- We'll insert an admin and a provider for testing
INSERT INTO users (username, password_hash, role) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'), -- password
('proveedor1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'provider'); -- password

-- 2. Products / Inventory Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dummy products
INSERT INTO products (name, description, price, stock) VALUES
('Laptop Dell XPS', 'Portátil de alto rendimiento', 1500.00, 10),
('Mouse Inalámbrico', 'Mouse ergonómico Logitech', 25.50, 50),
('Monitor 24"', 'Monitor IPS Full HD', 150.00, 20);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_modtime
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 3. Inventory Transactions (Entries/Exits)
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Sales Table
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Sale Items
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL -- price at the time of sale
);

-- 6. Provider Orders
CREATE TABLE provider_orders (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES users(id),
    status order_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_provider_orders_modtime
BEFORE UPDATE ON provider_orders
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 7. Provider Order Items
CREATE TABLE provider_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES provider_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL
);

-- 8. Equipment Management
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status equipment_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO equipment (name, description, status) VALUES
('Laptop Dell XPS', 'Portátil para uso en oficina', 'available'),
('Proyector Epson', 'Proyector para sala de juntas', 'available'),
('Cámara Canon', 'Cámara DSLR para eventos', 'available');

-- 9. Equipment Loans
CREATE TABLE equipment_loans (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER REFERENCES equipment(id),
    customer_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actual_end_time TIMESTAMP,
    status loan_status NOT NULL DEFAULT 'active'
);
