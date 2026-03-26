-- =====================================================
-- MICRO ERP - Sistema de Gestión Completo
-- Base de Datos MySQL
-- =====================================================

-- 1. Users Table (Authentication & Roles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role ENUM('admin', 'provider', 'operator') NOT NULL DEFAULT 'admin',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO users (username, email, password_hash, full_name, role) VALUES 
('admin', 'admin@microerp.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 'admin'),
('proveedor1', 'proveedor1@microerp.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Juan Pérez', 'provider'),
('operador1', 'operador@microerp.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carlos Operador', 'operator');

-- 2. Categories Table (Product Categories)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

INSERT INTO categories (name, description) VALUES
('Tecnología', 'Equipos y dispositivos tecnológicos'),
('Electrónica', 'Componentes y accesorios electrónicos'),
('Oficina', 'Suministros de oficina'),
('Redes', 'Equipos de red y conectividad'),
('Accesorios', 'Accesorios diversos');

-- 3. Products / Inventory Table (Enhanced)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id INT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cost_price DECIMAL(12, 2) DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT DEFAULT 5,
    max_stock INT DEFAULT 100,
    unit VARCHAR(20) DEFAULT 'unidad',
    barcode VARCHAR(50),
    location VARCHAR(100),
    image_url VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

INSERT INTO products (sku, name, description, category_id, price, cost_price, stock, min_stock) VALUES
('LAP-DELL-001', 'Laptop Dell XPS 15', 'Portátil de alto rendimiento 15.6"', 1, 1500.00, 1100.00, 10, 3),
('MOU-LOG-001', 'Mouse Inalámbrico Logitech', 'Mouse ergonómico silencioso', 2, 25.50, 12.00, 50, 10),
('MON-SAM-001', 'Monitor Samsung 24"', 'Monitor IPS Full HD 24 pulgadas', 1, 150.00, 95.00, 20, 5),
('TEC-HP-001', 'Teclado HP Mecánico', 'Teclado gaming RGB', 2, 45.00, 25.00, 30, 8),
('RAM-KIN-001', 'Memoria RAM 8GB DDR4', 'RAM Kingston 8GB 2666MHz', 1, 35.00, 22.00, 100, 20),
('DIS-SAM-001', 'SSD Samsung 500GB', 'Disco sólido NVMe 500GB', 1, 55.00, 35.00, 45, 10),
('CAU-UNI-001', 'Cable USB-C 1m', 'Cable de carga y datos', 5, 8.00, 3.00, 200, 30),
('AUD-LOG-001', 'Audífonos Logitech', 'Audífonos con micrófono', 2, 30.00, 15.00, 25, 5),
('ROU-TP-001', 'Router TP-Link AC1200', 'Router WiFi dual band', 4, 35.00, 20.00, 15, 3),
('IMP-EPS-001', 'Impresora Epson L3250', 'Impresora multifunción WiFi', 1, 180.00, 120.00, 8, 2);

-- 4. Inventory Transactions (Stock History)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    type ENUM('in', 'out', 'adjustment', 'sale', 'return', 'transfer') NOT NULL,
    quantity INT NOT NULL,
    stock_before INT NOT NULL,
    stock_after INT NOT NULL,
    reference_type VARCHAR(50),
    reference_id INT,
    notes TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Sales Table (Enhanced)
CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE,
    customer_name VARCHAR(100),
    customer_document VARCHAR(20),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('cash', 'card', 'transfer', 'credit') DEFAULT 'cash',
    status ENUM('pending', 'completed', 'cancelled', 'refunded') DEFAULT 'completed',
    notes TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Sale Items (Enhanced)
CREATE TABLE IF NOT EXISTS sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    subtotal DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 7. Suppliers Directory (NEW - Enhanced Provider Management)
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    company_name VARCHAR(200),
    rfc_tax_id VARCHAR(30),
    contact_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(50) DEFAULT 'México',
    postal_code VARCHAR(10),
    category_id INT,
    rating INT DEFAULT 0,
    payment_terms VARCHAR(50) DEFAULT 'contado',
    notes TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

INSERT INTO suppliers (name, company_name, rfc_tax_id, contact_name, email, phone, address, city, payment_terms) VALUES
('Tech Solutions SA', 'Tech Solutions SA de CV', 'TSO20190123', 'María García', 'ventas@techsolutions.com', '55-1234-5678', 'Av. Insurgentes 100', 'Ciudad de México', '30 días'),
('Electrónica del Norte', 'Electrónica del Norte S.A.', 'ELN20180515', 'Roberto Hernández', 'contacto@electronorte.com', '81-2345-6789', 'Av. Alfonso Reyes 500', 'Monterrey', 'contado'),
('Suministros Express', 'Suministros Express', 'SUP20200101', 'Ana López', 'compras@suminexpress.com', '33-3456-7890', 'Av. Vallarta 1200', 'Guadalajara', '15 días');

-- 8. Supplier Products (Price Lists per Supplier)
CREATE TABLE IF NOT EXISTS supplier_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    product_id INT NOT NULL,
    supplier_sku VARCHAR(50),
    supplier_price DECIMAL(12, 2) NOT NULL,
    min_order_quantity INT DEFAULT 1,
    lead_time_days INT DEFAULT 7,
    is_preferred TINYINT(1) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_supplier_product (supplier_id, product_id)
);

-- 9. Provider Orders (Enhanced Purchase Orders)
CREATE TABLE IF NOT EXISTS provider_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE,
    supplier_id INT NOT NULL,
    status ENUM('draft', 'pending', 'sent', 'confirmed', 'in_transit', 'received', 'partial', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    order_date DATE NOT NULL,
    expected_date DATE,
    received_date DATE,
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
    notes TEXT,
    created_by INT,
    confirmed_by INT,
    received_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. Provider Order Items
CREATE TABLE IF NOT EXISTS provider_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_ordered INT NOT NULL,
    quantity_received INT DEFAULT 0,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    subtotal DECIMAL(12, 2) NOT NULL,
    status ENUM('pending', 'partial', 'fulfilled', 'cancelled') DEFAULT 'pending',
    FOREIGN KEY (order_id) REFERENCES provider_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 11. Computer Stations (NEW - Cibercontrol)
CREATE TABLE IF NOT EXISTS computer_stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    hostname VARCHAR(100),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    mac_address_2 VARCHAR(17),
    location VARCHAR(100),
    specifications TEXT,
    status ENUM('available', 'occupied', 'maintenance', 'offline') DEFAULT 'available',
    hourly_rate DECIMAL(8, 2) DEFAULT 10.00,
    is_active TINYINT(1) DEFAULT 1,
    last_seen TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO computer_stations (name, hostname, ip_address, location, status, hourly_rate) VALUES
('PC-01', 'CYBER-PC01', '192.168.1.101', 'Zona A - Frente', 'available', 15.00),
('PC-02', 'CYBER-PC02', '192.168.1.102', 'Zona A - Fondo', 'available', 15.00),
('PC-03', 'CYBER-PC03', '192.168.1.103', 'Zona B', 'available', 12.00),
('PC-04', 'CYBER-PC04', '192.168.1.104', 'Zona B', 'available', 12.00),
('PC-05', 'CYBER-PC05', '192.168.1.105', 'VIP', 'available', 25.00);

-- 12. Internet Sessions (NEW - Cibercontrol)
CREATE TABLE IF NOT EXISTS cyber_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    station_id INT NOT NULL,
    customer_name VARCHAR(100),
    customer_document VARCHAR(20),
    phone VARCHAR(20),
    session_type ENUM('time', 'amount') NOT NULL DEFAULT 'time',
    time_minutes INT,
    amount_paid DECIMAL(10, 2),
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    time_used_seconds INT DEFAULT 0,
    cost_per_minute DECIMAL(8, 2) DEFAULT 0.00,
    total_cost DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('active', 'paused', 'completed', 'cancelled') DEFAULT 'active',
    payment_method ENUM('cash', 'card', 'transfer') DEFAULT 'cash',
    notes TEXT,
    closed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES computer_stations(id) ON DELETE RESTRICT,
    FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 13. Print Jobs (NEW - Cibercontrol)
CREATE TABLE IF NOT EXISTS print_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    station_id INT,
    customer_name VARCHAR(100),
    document_name VARCHAR(255),
    pages INT DEFAULT 1,
    copies INT DEFAULT 1,
    price_per_page DECIMAL(8, 2) DEFAULT 1.00,
    total_price DECIMAL(10, 2),
    status ENUM('pending', 'printing', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES computer_stations(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 14. Services (NEW - Cibercontrol Services)
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    duration_minutes INT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO services (name, description, category, price, duration_minutes) VALUES
('Impresión B/N', 'Impresión hoja tamaño carta B/N', 'impresion', 1.00, 5),
('Impresión Color', 'Impresión hoja tamaño carta color', 'impresion', 5.00, 10),
('Fotocopia B/N', 'Fotocopia B/N', 'fotocopia', 1.00, 2),
('Escaneo', 'Escaneo de documentos', 'escaneo', 3.00, 5),
('Laminado', 'Laminado tamaño carta', 'laminado', 5.00, 10),
('CD/DVD', 'Grabado de CD/DVD', 'multimedia', 15.00, 20),
('Instalación Software', 'Instalación de software básico', 'soporte', 50.00, 30);

-- 15. Service Transactions (NEW)
CREATE TABLE IF NOT EXISTS service_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    customer_name VARCHAR(100),
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    payment_method ENUM('cash', 'card', 'transfer') DEFAULT 'cash',
    notes TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 16. Equipment (Equipment Loans - existing)
CREATE TABLE IF NOT EXISTS equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    serial_number VARCHAR(100),
    purchase_date DATE,
    warranty_expiry DATE,
    status ENUM('available', 'in_use', 'maintenance', 'cleaning', 'retired') NOT NULL DEFAULT 'available',
    hourly_rate DECIMAL(8, 2) DEFAULT 2.00,
    category VARCHAR(50),
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO equipment (name, description, serial_number, status, hourly_rate, category) VALUES
('Proyector Epson', 'Proyector para presentaciones', 'EPS-2024-001', 'available', 50.00, 'proyeccion'),
('Cámara Canon DSLR', 'Cámara para eventos', 'CAN-2023-045', 'available', 100.00, 'fotografia'),
('Bocinas Portátiles', 'Sistema de sonido Bluetooth', 'BOC-2024-012', 'available', 25.00, 'audio'),
('Laptop Prestamo', 'Laptop para préstamos temporales', 'LAP-PREST-001', 'available', 30.00, 'computo');

-- 17. Equipment Loans
CREATE TABLE IF NOT EXISTS equipment_loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    customer_document VARCHAR(20),
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_end_time TIMESTAMP,
    actual_end_time TIMESTAMP NULL,
    hourly_rate DECIMAL(8, 2),
    total_hours DECIMAL(8, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('active', 'completed', 'overdue', 'cancelled') NOT NULL DEFAULT 'active',
    payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
    notes TEXT,
    created_by INT,
    closed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 18. Reports - Daily Summary (Auto-generated)
CREATE TABLE IF NOT EXISTS daily_summaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    summary_date DATE NOT NULL UNIQUE,
    total_sales DECIMAL(12, 2) DEFAULT 0.00,
    total_sales_count INT DEFAULT 0,
    total_cyber_revenue DECIMAL(12, 2) DEFAULT 0.00,
    total_cyber_sessions INT DEFAULT 0,
    total_services_revenue DECIMAL(12, 2) DEFAULT 0.00,
    total_services_count INT DEFAULT 0,
    total_equipment_revenue DECIMAL(12, 2) DEFAULT 0.00,
    total_equipment_loans INT DEFAULT 0,
    total_purchases DECIMAL(12, 2) DEFAULT 0.00,
    total_purchases_count INT DEFAULT 0,
    inventory_value DECIMAL(12, 2) DEFAULT 0.00,
    cash_in DECIMAL(12, 2) DEFAULT 0.00,
    cash_out DECIMAL(12, 2) DEFAULT 0.00,
    cash_balance DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 19. Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_inventory_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_date ON inventory_transactions(created_at);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_cyber_station ON cyber_sessions(station_id);
CREATE INDEX idx_cyber_status ON cyber_sessions(status);
CREATE INDEX idx_cyber_date ON cyber_sessions(start_time);
CREATE INDEX idx_provider_orders_supplier ON provider_orders(supplier_id);
CREATE INDEX idx_provider_orders_status ON provider_orders(status);
CREATE INDEX idx_provider_orders_date ON provider_orders(order_date);

-- =====================================================
-- VIEWS (for common queries)
-- =====================================================
CREATE OR REPLACE VIEW v_product_inventory AS
SELECT 
    p.id,
    p.sku,
    p.name,
    p.category_id,
    c.name as category_name,
    p.price,
    p.cost_price,
    p.stock,
    p.min_stock,
    p.max_stock,
    (p.price * p.stock) as stock_value,
    CASE 
        WHEN p.stock <= 0 THEN 'out_of_stock'
        WHEN p.stock <= p.min_stock THEN 'low_stock'
        WHEN p.stock >= p.max_stock THEN 'overstocked'
        ELSE 'normal'
    END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = 1;

CREATE OR REPLACE VIEW v_sales_summary AS
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_transactions,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as average_ticket,
    SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as cash_sales,
    SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END) as card_sales
FROM sales
WHERE status = 'completed'
GROUP BY DATE(created_at);

CREATE OR REPLACE VIEW v_cyber_daily AS
SELECT 
    DATE(start_time) as session_date,
    COUNT(*) as total_sessions,
    SUM(total_cost) as total_revenue,
    SUM(time_used_seconds) / 60 as total_minutes,
    AVG(time_used_seconds) / 60 as avg_minutes_per_session
FROM cyber_sessions
WHERE status IN ('active', 'completed')
GROUP BY DATE(start_time);
