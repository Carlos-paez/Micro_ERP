# Documentación Técnica - Sistema Micro ERP

## 1. Arquitectura del Sistema

El sistema está construido como una **Single Page Application (SPA)** utilizando Vanilla JavaScript, con una API RESTful construida en PHP puro y una base de datos MySQL. No se utilizan frameworks de terceros, garantizando máxima ligereza y control directo sobre el código.

### 1.1 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | HTML5, Vanilla CSS3, Vanilla JavaScript (ES6+) |
| Backend | PHP 8+ con PDO |
| Base de Datos | MySQL 5.7+ |
| Servidor Web | Apache/Nginx o PHP Built-in Server |

### 1.2 Patrón Arquitectónico

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Navegador     │────▶│  API REST PHP   │────▶│  MySQL Database │
│  (Frontend)     │◀────│    (Backend)    │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 2. Estructura de Directorios

```
Micro_ERP/
├── api/                        # Controladores del Backend
│   ├── db.php                  # Conexión PDO y utilidades globales
│   ├── auth.php                # Autenticación y gestión de sesiones
│   ├── dashboard.php           # Estadísticas y KPIs
│   ├── equipment.php           # Gestión de equipos y préstamos
│   ├── inventory.php           # CRUD de inventario y ventas
│   ├── providers.php           # Gestión de pedidos a proveedores
│   ├── cyber.php               # Control de cibercafé
│   ├── reports.php             # Reportes y estadísticas avanzadas
│   └── categories.php          # Categorías de productos
├── css/
│   └── style.css               # Sistema de diseño global
├── js/                         # Lógica del Frontend
│   ├── app.js                  # Controlador principal SPA
│   ├── equipment.js            # Gestión de equipamiento
│   ├── inventory.js            # Inventario y ventas
│   ├── providers.js            # Gestión de proveedores
│   ├── cyber.js                # Control de cibercafé
│   └── reports.js              # Reportes
├── index.html                  # Punto de entrada (Login/Registro)
├── app.html                    # Estructura principal SPA
├── init.sql                    # Esquema completo de base de datos
├── README.md                   # Guía de inicio
└── USER_MANUAL.md              # Manual de usuario
```

## 3. Modelo de Base de Datos

### 3.1 Esquema de Tablas

#### users - Usuarios del sistema
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| username | VARCHAR(50) | Nombre de usuario (único) |
| email | VARCHAR(100) | Correo electrónico |
| password_hash | VARCHAR(255) | Contraseña hasheada |
| full_name | VARCHAR(100) | Nombre completo |
| role | ENUM('admin','provider','operator') | Rol del usuario |
| is_active | TINYINT(1) | Estado activo |
| created_at | TIMESTAMP | Fecha de creación |

#### categories - Categorías de productos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| name | VARCHAR(100) | Nombre de categoría |
| description | TEXT | Descripción |
| parent_id | INT | Categoría padre (subcategorías) |

#### products - Catálogo de productos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| sku | VARCHAR(50) | Código SKU (único) |
| name | VARCHAR(100) | Nombre del producto |
| description | TEXT | Descripción |
| category_id | INT | FK a categories |
| price | DECIMAL(10,2) | Precio de venta |
| cost_price | DECIMAL(10,2) | Costo de adquisición |
| stock | INT | Cantidad en inventario |
| min_stock | INT | Stock mínimo alerta |
| max_stock | INT | Stock máximo |
| unit | VARCHAR(20) | Unidad de medida |
| barcode | VARCHAR(50) | Código de barras |
| is_active | TINYINT(1) | Estado activo |

#### sales - Registro de ventas
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| total_amount | DECIMAL(10,2) | Total de la venta |
| payment_method | ENUM | Método de pago |
| status | ENUM('pending','completed','cancelled') | Estado |
| customer_name | VARCHAR(100) | Nombre del cliente |
| created_at | TIMESTAMP | Fecha de venta |

#### sale_items - Ítems de cada venta
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| sale_id | INT | FK a sales |
| product_id | INT | FK a products |
| quantity | INT | Cantidad vendida |
| price | DECIMAL(10,2) | Precio unitario |

#### providers - Proveedores
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| company_name | VARCHAR(100) | Nombre de empresa |
| contact_name | VARCHAR(100) | Contacto |
| email | VARCHAR(100) | Correo |
| phone | VARCHAR(20) | Teléfono |
| address | TEXT | Dirección |
| is_active | TINYINT(1) | Estado activo |

#### provider_orders - Pedidos a proveedores
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| provider_id | INT | FK a providers |
| total_amount | DECIMAL(10,2) | Total del pedido |
| status | ENUM | Estado del pedido |
| created_at | TIMESTAMP | Fecha de creación |

#### computer_stations - Estaciones de cibercafé
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| name | VARCHAR(50) | Nombre (PC-01, etc.) |
| hostname | VARCHAR(100) | Hostname |
| ip_address | VARCHAR(45) | Dirección IP |
| status | ENUM | Estado (available/occupied/maintenance) |
| hourly_rate | DECIMAL(8,2) | Tarifa por hora |

#### cyber_sessions - Sesiones de cibercafé
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| station_id | INT | FK a computer_stations |
| customer_name | VARCHAR(100) | Nombre del cliente |
| start_time | TIMESTAMP | Inicio de sesión |
| end_time | TIMESTAMP | Fin de sesión |
| total_cost | DECIMAL(10,2) | Costo total |
| status | ENUM | Estado (active/paused/completed) |

#### equipment - Equipamiento prestable
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| name | VARCHAR(100) | Nombre del equipo |
| description | TEXT | Descripción |
| serial_number | VARCHAR(50) | Número de serie |
| status | ENUM | Estado (available/in_use/maintenance) |
| hourly_rate | DECIMAL(8,2) | Tarifa por hora |
| category | VARCHAR(50) | Categoría |

#### equipment_loans - Préstamos de equipo
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identificador único |
| equipment_id | INT | FK a equipment |
| customer_name | VARCHAR(100) | Cliente |
| start_time | TIMESTAMP | Inicio |
| end_time | TIMESTAMP | Fin planeado |
| actual_end_time | TIMESTAMP | Fin real |
| status | ENUM | Estado (active/completed/overdue) |

## 4. Patrones de Diseño

### 4.1 SPA (Single Page Application)

El archivo `app.js` maneja la navegación entre módulos sin recargar la página:

```javascript
// app.js - Navegación SPA
app.navigate('dashboard');  // Carga el módulo dashboard
app.navigate('inventory');  // Carga el módulo inventario
```

Los templates se definen en `app.html` usando elementos `<template>` que se clonan dinámicamente.

### 4.2 API REST con Front Controller

Todos los endpoints PHP siguen el mismo patrón:

```php
$action = $_GET['action'] ?? '';
switch($action) {
    case 'list':
        // Listar recursos
        break;
    case 'create':
        // Crear recurso
        break;
    case 'update':
        // Actualizar recurso
        break;
    case 'delete':
        // Eliminar recurso
        break;
}
```

### 4.3 Autenticación y Sesiones

```php
// Verificar autenticación
if (!isset($_SESSION['user_id'])) {
    sendJSON(['error' => 'Unauthorized'], 403);
}

// Verificar rol de administrador
if ($_SESSION['role'] !== 'admin') {
    sendJSON(['error' => 'Forbidden'], 403);
}
```

### 4.4 Transacciones y Integridad

```php
try {
    $pdo->beginTransaction();
    
    //插入订单
    $stmt->execute([...]);
    $orderId = $pdo->lastInsertId();
    
    //插入订单项
    foreach ($items as $item) {
        $stmt->execute([...]);
    }
    
    //更新库存
    $stmt->execute([...]);
    
    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    sendJSON(['error' => $e->getMessage()], 500);
}
```

## 5. Flujos de Usuario

### 5.1 Login y Autenticación

```
1. Usuario ingresa credenciales en index.html
2. Frontend envía POST a api/auth.php?action=login
3. Backend verifica credenciales contra tabla 'users'
4. Si válidas: crea sesión PHP y retorna datos del usuario
5. Frontend redirige a app.html
6. app.html verifica sesión con api/auth.php?action=session
```

### 5.2 Registro de Venta

```
1. Operador hace clic en "Registrar Venta"
2. Selecciona producto y cantidad
3. Frontend envía POST a api/inventory.php?action=sell
4. Backend:
   - Crea registro en tabla 'sales'
   - Crea registros en 'sale_items'
   - Resta stock en 'products'
   - Crea registro en 'inventory_transactions'
5. Retorna éxito y actualiza UI
```

### 5.3 Pedido a Proveedor

```
1. Admin crea pedido seleccionando proveedor y productos
2. Estado inicial: 'pending'
3. Proveedor recibe notificación y marca como 'sent'
4. Admin recibe mercancía y marca como 'received'
5. Backend actualiza stock de productos
6. Estado final: 'completed'
```

### 5.4 Sesión de Cibercafé

```
1. Cliente selecciona estación disponible
2. Operador inicia sesión
3. Backend registra inicio y calcula costo por tiempo
4. Cliente puede pausar/reanudar
5. Al finalizar, operador cierra sesión
6. Backend calcula tiempo total y costo
```

## 6. Seguridad

### 6.1 Protección contra SQL Injection

```php
// Uso de prepared statements
$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
$stmt->execute([$username]);
```

### 6.2 Hash de Contraseñas

```php
// Hash con bcrypt
$hash = password_hash($password, PASSWORD_DEFAULT);

// Verificación
if (password_verify($password, $hash)) {
    // Contraseña correcta
}
```

### 6.3 Control de Acceso

- Sesiones PHP con `session_start()`
- Verificación de rol en cada endpoint
- CORS no implementado (mismo origen)

## 7. Configuración del Entorno

### 7.1 Variables de Entorno (opcional)

```php
// db.php
$host = getenv('DB_HOST') ?: 'localhost';
$db   = getenv('DB_NAME') ?: 'micro_erp';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$port = getenv('DB_PORT') ?: '3306';
```

### 7.2 Inicialización de Base de Datos

```bash
mysql -u root -p micro_erp < init.sql
```

El archivo `init.sql` contiene:
- CREATE TABLE para todas las entidades
- INSERT de datos iniciales (usuarios, productos, categorías, estaciones)

## 8. Códigos de Respuesta API

| Código | Significado |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

## 9. Errores Comunes y Soluciones

### 9.1 "Database connection failed"
- Verificar que MySQL esté ejecutándose
- Revisar credenciales en `api/db.php`
- Confirmar que la base de datos existe

### 9.2 "Call to undefined function sendJSON()"
- Verificar que `api/db.php` se incluye correctamente
-确保函数定义没有重复

### 9.3 "Unknown column 'name'"
- Ejecutar `init.sql` para crear todas las columnas
- Verificar que la tabla tiene las columnas esperadas

### 9.4 "Unauthorized"
- Verificar que el navegador tiene cookies habilitadas
- Iniciar sesión correctamente antes de acceder a la API

## 10. Extensiones PHP Requeridas

- `pdo` - PHP Data Objects
- `pdo_mysql` - MySQL driver para PDO
- `json` - Funciones JSON
- `mbstring` - Cadenas multibyte

Verificar con:
```php
php -m
```

## 11. Contributing

Para contribuir al proyecto:
1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request
