# Documentación Técnica - Sistema ERP Web Avanzado

## 1. Arquitectura del Sistema
El sistema está construido como una **Single Page Application (SPA)** simple utilizando Vanilla JavaScript, apoyado por una API RESTful construida en PHP puro y una base de datos relacional PostgreSQL. No se utilizan frameworks de terceros (como Laravel, React o Bootstrap), garantizando máxima ligereza, rapidez y control directo sobre el código.

### 1.1 Stack Tecnológico
- **Frontend**: HTML5, Vanilla CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript (ES6+).
- **Backend**: PHP 8+ (PDO para abstracción de base de datos).
- **Base de Datos**: PostgreSQL 13+.
- **Servidor Web**: PHP Built-in Server (para desarrollo) o Apache/Nginx (producción).

---

## 2. Estructura de Directorios

```text
d:\DEV\prueba\
├── api/                        # Controladores del Backend (Endpoints)
│   ├── db.php                  # Conexión PDO a PostgreSQL y utilidades globales.
│   ├── auth.php                # Gestión de sesiones, login y registro de usuarios.
│   ├── dashboard.php           # Estadísticas generales e indicadores (KPIs).
│   ├── equipment.php           # Gestión de estados de equipos y préstamos.
│   ├── inventory.php           # CRUD de inventario y registro de ventas.
│   └── providers.php           # Gestión de pedidos, control de roles y estados de envío.
├── css/
│   └── style.css               # Sistema de diseño global (Tema oscuro, responsive).
├── js/                         # Lógica Frontend y consumo de APIs
│   ├── app.js                  # Enrutador SPA, manejo de sesiones UI, y modales base.
│   ├── equipment.js            # Lógica de temporización local (`setInterval` y alertas nativas).
│   ├── inventory.js            # Tablas interactivas, creación/edición de productos y ventas.
│   └── provider.js             # Lógica de proveedores, workflow de pedidos de 3 estados.
├── index.html                  # Punto de entrada público (Vista Login/Registro).
├── app.html                    # Estructura principal de la SPA (solo para usuarios autenticados).
├── init.sql                    # Script DDL de generación de la base de datos completa con datos default.
├── TECHNICAL_DOCUMENTATION.md  # Este archivo.
└── USER_MANUAL.md              # Manual para el usuario final.
```

---

## 3. Modelo de Base de Datos (PostgreSQL)

El esquema de BDD es relacional e incorpora las siguientes tablas principales:

1. **`users`**: Soporta inicio de sesión clásico, con el campo `role` predefinido (`admin`, `provider`). Las contraseñas se almacenan mediante `password_hash()` de PHP (algoritmo bcrypt/argon2).
2. **`products`**: Catálogo base del inventario. La columna `stock` funge como fuente de la verdad para la disponibilidad actual.
3. **`inventory_transactions`**: Registro histórico inmutable de entradas y salidas de cada producto (`type` = 'in' | 'out'). Las ventas y cierres de pedidos de proveedores disparan *triggers lógicos* automáticos (desde el código PHP) a esta tabla.
4. **`sales` y `sale_items`**: Almacenan agrupadas las transacciones salientes ejecutadas internamente frente al local, y están atadas bajo la restricción `ON DELETE CASCADE`.
5. **`provider_orders` y `provider_order_items`**: Gestionan las reposiciones. Emplean campo tipo ENUM escalar para administrar la máquina de estado del pedido:
   - `pending`: Creado, el proveedor debe despacharlo.
   - `fulfilled`: Proveedor lo empaqueta y reporta como enviado.
   - `completed`: El administrador recibe físicamente la carga; el ciclo se cierra y el stock aumenta.
   - `cancelled`: El ciclo es abortado prematuramente sin alterar inventarios.
6. **`equipment` y `equipment_loans`**: Manejan activos finos de la empresa. `equipment` tiene un estado fijo dinámico (`available`, `in_use`, `maintenance`).

---

## 4. Patrones de Diseño Aplicados

### 4.1. Carga Dinámica de Vistas (SPA)
El archivo `app.js` contiene un motor de enrutamiento basado en anclas (Hash Routing via `window.location.hash`). 
```javascript
// app.js - Motor simplificado de enrutamiento
app.navigate(viewId);
// Clona el contenido de los contenedores <template id="..."> y lo inyecta en <main id="view-container">.
```
*   **Beneficio**: El DOM se recicla sin refrescar la página.

### 4.2. Controlador de Módulo
En el directorio `/api/`, los archivos PHP operan bajo un patrón derivado de Front-Controller modificado, discriminando mediante el parámetro GET `action`.
```php
$action = $_GET['action'] ?? '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
     if ($action === 'list') { ... } 
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
     if ($action === 'create') { ... }
}
```

### 4.3. Restricción de Roles en la API
Toda tabla sensible es verificada internamente:
```php
if ($role !== 'admin' && no_es_dueño_del_recurso) { 
    sendJSON(['error' => 'Permisos insuficientes'], 403); 
}
```

### 4.4. Integridad Referencial Estricta (Transaccionalidad)
Cualquier manipulación a elementos múltiples (por ejemplo, guardar una orden y sus ítems, luego actualizar el stock en productos) siempre se empaqueta en un bloque `try-catch` usando `pdo->beginTransaction()` y `pdo->commit()`. Si algo falla (ej: fallo de red), interviene el `pdo->rollBack()`. Así se preserva la integridad ACID.

---

## 5. Implementaciones Específicas de Flujo

### Alertador Client-Side (`equipment.js`)
Dado que los préstamos estipulan un tiempo concreto (`duration_minutes`), se genera un cálculo local frente a la hora estática de inicio del servidor cada 5000ms. Al expirar `Date.now() > end_time`, se detonan las alertas. Se optimizó un Garbage Collector (`clearInterval`) que frena el loop indefinido si no hay componentes que auditar.

### Seguridad
- Las contraseñas viajan desde el formulario e inmediatamente son procesadas en `auth.php` a través de transacciones preparadas `prepare()` en PDO para truncar cualquier intento de **SQL Injection**.
- Se requiere que el servidor PHP se configure para forzar cabeceras de caché contra el robo de sesiones y se recomienda HTTPS para un paso a producción definitivo.

---

## 6. Errores Comunes o TroubleShooting
1. **"could not find driver"**: Extensión `pdo_pgsql` faltante en el `php.ini` de Windows. Descomentar `extension=pdo_pgsql`.
2. **"Uncaught (in promise) SyntaxError: Unexpected token < in JSON at position 0"**: Esto ocurre si hay advertencias nativas de PHP (`E_NOTICE`, `E_WARNING`) derramándose por la consola al momento en que se intenta retornar cabeceras `JSON`. Para prevenirlo, setear `display_errors = Off` en el `php.ini` de producción o asegurarse que la base de datos esté accesible en el TCP/IP 5432.
