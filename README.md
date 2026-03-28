# Micro ERP - Sistema de Gestión Integral

[![PHP Version](https://img.shields.io/badge/PHP-8.0%2B-blue)](https://www.php.net/)
[![MySQL Version](https://img.shields.io/badge/MySQL-5.7%2B-orange)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Sistema de gestión empresarial integral para administración de inventarios, ventas, proveedores, cibercontrol y equipamiento.

## Características Principales

- **Gestión de Inventario**: Control completo de productos con SKU, categorías, precios y stock
- **Punto de Venta (POS)**: Registro rápido de ventas con actualización automática de inventario
- **Módulo de Proveedores**: Gestión de pedidos, seguimiento de envíos y recepción de mercancía
- **Cibercontrol**: Control de sesiones de cibercafé con计时 y facturación automática
- **Equipamiento**: Préstamo de equipos con temporizador y alertas
- **Dashboard**: Estadísticas en tiempo real y métricas clave del negocio
- **Reportes**: Informes de ventas, inventario y finances

## Requisitos del Sistema

- PHP 8.0 o superior
- MySQL 5.7 o superior
- Servidor web (Apache, Nginx) o PHP Built-in Server
- Extensiones PHP: `pdo`, `pdo_mysql`, `json`

## Instalación

### 1. Clonar o descargar el proyecto

```bash
git clone https://github.com/tu-usuario/Micro_ERP.git
cd Micro_ERP
```

### 2. Configurar la base de datos

1. Crear una base de datos MySQL:
```sql
CREATE DATABASE micro_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Importar el esquema:
```bash
mysql -u root -p micro_erp < init.sql
```

### 3. Configurar conexión a la base de datos

Editar `api/db.php`:
```php
$host = 'localhost';      // Servidor de base de datos
$db   = 'micro_erp';      // Nombre de la base de datos
$user = 'root';           // Usuario de MySQL
$pass = 'tu_contraseña';  // Contraseña de MySQL
$port = '3306';           // Puerto de MySQL
```

### 4. Iniciar el servidor

Opción A - PHP Built-in Server:
```bash
php -S localhost:80 -t .
```

Opción B - Apache/Nginx:
Configurar el documento raíz hacia la carpeta del proyecto.

### 5. Acceder a la aplicación

Abrir en el navegador: `http://localhost/Micro_ERP/`

## Usuarios de Prueba

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Administrador | admin | password |
| Proveedor | proveedor1 | password |
| Operador | operador1 | password |

> **Nota**: Las contraseñas están hasheadas con bcrypt. La contraseña por defecto para todos los usuarios de prueba es `password`.

## Estructura del Proyecto

```
Micro_ERP/
├── api/                    # Backend API (PHP)
│   ├── auth.php           # Autenticación y sesiones
│   ├── dashboard.php      # Estadísticas del dashboard
│   ├── cyber.php          # Control de cibercafé
│   ├── equipment.php      # Gestión de equipamiento
│   ├── inventory.php      # Control de inventario
│   ├── providers.php      # Gestión de proveedores
│   ├── reports.php        # Reportes y estadísticas
│   ├── categories.php     # Categorías de productos
│   ├── verify.php         # Verificación de credenciales
│   ├── test_db_conn.php  # Test de conexión BD
│   ├── migrate.php        # Migraciones de esquema
│   └── db.php             # Conexión a base de datos
├── css/
│   └── style.css          # Estilos globales
├── js/                     # Frontend JavaScript
│   ├── app.js             # Controlador principal
│   ├── inventory.js       # Módulo de inventario
│   ├── provider.js        # Módulo de proveedores
│   ├── cyber.js           # Módulo de cibercontrol
│   ├── equipment.js       # Módulo de equipamiento
│   └── reports.js         # Módulo de reportes
├── index.html             # Login/Registro
├── app.html               # Aplicación principal
├── init.sql               # Esquema de base de datos
├── test_config.php       # Configuración de pruebas
└── README.md              # Este archivo
```

## Roles de Usuario

### Administrador
Acceso completo a todos los módulos:
- Dashboard con estadísticas
- Gestión de inventario
- Registro de ventas
- Control de proveedores
- Cibercontrol
- Equipamiento
- Reportes

### Proveedor
Acceso limitado:
- Ver sus pedidos
- Crear/actualizar pedidos
- Marcar pedidos como enviados
- Cancelar pedidos pendientes

### Operador
Acceso intermedio:
- Cibercontrol (inicio/fin de sesiones)
- Inventario (consulta y ventas)

## API Endpoints

### Autenticación
- `POST api/auth.php?action=login` - Iniciar sesión
- `POST api/auth.php?action=register` - Registrar usuario
- `POST api/auth.php?action=logout` - Cerrar sesión
- `GET api/auth.php?action=session` - Verificar sesión

### Inventario
- `GET api/inventory.php?action=list` - Listar productos
- `POST api/inventory.php?action=create` - Crear producto
- `POST api/inventory.php?action=update` - Actualizar producto
- `POST api/inventory.php?action=delete` - Eliminar producto
- `POST api/inventory.php?action=sell` - Registrar venta
- `POST api/inventory.php?action=adjust` - Ajustar stock

### Proveedores
- `GET api/providers.php?action=list` - Listar proveedores
- `POST api/providers.php?action=create` - Crear proveedor
- `POST api/providers.php?action=update` - Actualizar proveedor
- `POST api/providers.php?action=delete` - Eliminar proveedor
- `GET api/providers.php?action=orders` - Listar pedidos
- `POST api/providers.php?action=create_order` - Crear pedido
- `POST api/providers.php?action=update_order` - Actualizar pedido
- `POST api/providers.php?action=receive_order` - Recibir pedido

### Cibercontrol
- `GET api/cyber.php?action=list_stations` - Listar estaciones
- `POST api/cyber.php?action=start_session` - Iniciar sesión
- `POST api/cyber.php?action=end_session` - Finalizar sesión
- `POST api/cyber.php?action=pause_session` - Pausar sesión

### Equipamiento
- `GET api/equipment.php?action=list` - Listar equipos
- `POST api/equipment.php?action=create` - Crear equipo
- `POST api/equipment.php?action=loan` - Prestar equipo
- `POST api/equipment.php?action=return` - Devolver equipo

### Dashboard
- `GET api/dashboard.php?action=stats` - Obtener estadísticas

### Reportes
- `GET api/reports.php?action=dashboard` - Estadísticas generales
- `GET api/reports.php?action=sales` - Reporte de ventas
- `GET api/reports.php?action=inventory` - Reporte de inventario

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: PHP 8+ con PDO
- **Base de Datos**: MySQL
- **Estilos**: CSS Custom Properties, Flexbox, Grid

## Licencia

MIT License - Ver archivo LICENSE para más detalles.

## Soporte

Para reportar errores o sugerencias, crear un issue en el repositorio.

## Autores

- Sistema desarrollado para gestión de microempresas

---

**Última actualización**: Marzo 2026
