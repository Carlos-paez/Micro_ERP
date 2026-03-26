# Manual de Usuario - Sistema Micro ERP

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Dashboard](#3-dashboard)
4. [Gestión de Inventario](#4-gestión-de-inventario)
5. [Módulo de Proveedores](#5-módulo-de-proveedores)
6. [Cibercontrol](#6-cibercontrol)
7. [Equipamiento](#7-equipamiento)
8. [Reportes](#8-reportes)
9. [Resolución de Problemas](#9-resolución-de-problemas)

---

## 1. Introducción

Micro ERP es un sistema de gestión integral diseñado para administrar de manera eficiente el inventario, ventas, proveedores, cibercafé y equipamiento de tu negocio.

### Requisitos previos
- Navegador web moderno (Chrome, Firefox, Edge)
- Conexión a la base de datos configurada
- Credenciales de acceso proporcionadas por el administrador

---

## 2. Acceso al Sistema

### 2.1 Iniciar Sesión

1. Abre tu navegador y accede a la URL del sistema
2. En la pantalla de login, ingresa:
   - **Usuario**: Tu nombre de usuario
   - **Contraseña**: Tu contraseña
3. Haz clic en "Ingresar"

### 2.2 Crear una Cuenta

Si no tienes credenciales:

1. Haz clic en "¿No tienes cuenta? Regístrate aquí"
2. Completa el formulario:
   - **Usuario**: Nombre de acceso único
   - **Contraseña**: Mínimo 6 caracteres
   - **Nombre completo**: Tu nombre real
   - **Rol**: Selecciona el rol apropiado
3. Haz clic en "Crear Cuenta"

### 2.3 Roles de Usuario

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **Administrador** | Dueño o gerente | Todos los módulos |
| **Proveedor** | Proveedor externo | Solo pedidos |
| **Operador** | Empleado de atención | Inventario y Cibercontrol |

---

## 3. Dashboard

El Dashboard es el panel principal que muestra una visión general del negocio.

### 3.1 Estadísticas Disponibles

- **Ventas del Día**: Ingresos por ventas hoy
- **Ventas del Mes**: Ingresos por ventas en el mes actual
- **Cibercafé Hoy**: Ingresos del cibercafé hoy
- **Servicios Hoy**: Ingresos por servicios adicionales
- **Sesiones Activas**: Computadoras en uso actualmente
- **Equipos en Uso**: Equipamiento prestado
- **Valor del Inventario**: Valor total del stock
- **Pedidos Pendientes**: Pedidos a proveedores sin recibir

### 3.2 Secciones del Dashboard

- **Ventas Recientes**: Lista de últimas ventas realizadas
- **Sesiones Activas**: Cibercafé con equipos en uso
- **Productos con Stock Bajo**: Alerta de inventario bajo
- **Pedidos Recientes**: Seguimiento de pedidos a proveedores

### 3.3 Filtrar por Fechas

Utiliza los campos de fecha para filtrar estadísticas:
- Fecha inicial
- Fecha final

---

## 4. Gestión de Inventario

Este módulo permite gestionar todos los productos del negocio.

### 4.1 Ver Productos

Al acceder al módulo de inventario, verás una tabla con todos los productos que incluye:
- SKU (código interno)
- Nombre del producto
- Categoría
- Precio de venta
- Costo
- Stock actual
- Valor total en inventario

### 4.2 Crear Nuevo Producto

1. Haz clic en el botón **"+ Nuevo Producto"**
2. Completa el formulario:
   - **Nombre**: Nombre del producto
   - **SKU**: Código único (se genera automáticamente)
   - **Categoría**: Selecciona una categoría
   - **Precio**: Precio de venta
   - **Costo**: Precio de adquisición
   - **Stock inicial**: Cantidad actual
   - **Stock mínimo**: Alerta cuando baje de este nivel
   - **Stock máximo**: Cantidad máxima recomendada
   - **Unidad**: unidad, kilo, litro, etc.
3. Haz clic en "Guardar"

### 4.3 Editar Producto

1. Busca el producto en la tabla
2. Haz clic en el botón de editar (lápiz)
3. Modifica los campos necesarios
4. Haz clic en "Guardar Cambios"

### 4.4 Eliminar Producto

1. Busca el producto en la tabla
2. Haz clic en el botón de eliminar (basura)
3. Confirma la eliminación

**⚠️ Advertencia**: Eliminar un producto también elimina todas las ventas asociadas.

### 4.5 Registrar Venta (Punto de Venta)

1. Haz clic en **"💰 Registrar Venta"**
2. Selecciona el producto de la lista
3. Ingresa la cantidad
4. Opcional: Agrega más productos
5. Selecciona el método de pago:
   - Efectivo
   - Tarjeta
   - Transferencia
6. Ingresa el nombre del cliente (opcional)
7. Haz clic en "Completar Venta"

El sistema automáticamente:
- Crea el registro de venta
- Resta el stock del inventario
- Registra la transacción

### 4.6 Ajustar Stock

Para corregir el inventario (entradas, devoluciones, mermas):

1. Haz clic en **"Ajustar Stock"**
2. Selecciona el producto
3. Indica:
   - **Tipo**: Entrada o Salida
   - **Cantidad**: Cuántos unidades
   - **Notas**: Razón del ajuste
4. Haz clic en "Guardar"

### 4.7 Filtros de Búsqueda

- **Por categoría**: Filtra por tipo de producto
- **Por stock**: Muestra solo productos agotados o con stock bajo
- **Buscar**: Texto para buscar por nombre o SKU

---

## 5. Módulo de Proveedores

Gestión de pedidos de reposición de inventario.

### 5.1 Ver Proveedores

Lista de todos los proveedores dados de alta con:
- Nombre de empresa
- Contacto
- Teléfono y email
- Pedidos realizados

### 5.2 Crear Proveedor

1. Haz clic en **"+ Nuevo Proveedor"**
2. Completa los datos:
   - Nombre de empresa
   - Nombre del contacto
   - Email y teléfono
   - Dirección
   - RFC/Tax ID
   - Términos de pago
3. Guarda el proveedor

### 5.3 Crear Pedido

1. Haz clic en **"+ Nuevo Pedido"**
2. Selecciona el proveedor
3. Agrega productos:
   - Producto
   - Cantidad
   - Costo unitario
4. El sistema calcula el total
5. Guarda el pedido

### 5.4 Estados del Pedido

| Estado | Color | Descripción |
|--------|-------|-------------|
| Pendiente | Naranja | Esperando envío |
| Enviado | Azul | En camino |
| En Tránsito | Azul claro | En proceso de entrega |
| Recibido | Verde | Completado y stock actualizado |
| Cancelado | Rojo | Cancelado por alguna razón |

### 5.5 Flujo de Pedido

1. **Admin crea pedido** → Estado: Pendiente
2. **Proveedor lo revisa** → Marca como Enviado
3. **En tránsito** → Actualiza estado
4. **Admin recibe** → Marca como Recibido
5. **Stock se actualiza** → El inventario aumenta

---

## 6. Cibercontrol

Control de sesiones de cibercafé/computadoras.

### 6.1 Estaciones

Cada computadora o estación tiene:
- Nombre (PC-01, PC-02, etc.)
- Ubicación en el local
- Tarifa por hora
- Estado actual

### 6.2 Estados de Estación

| Estado | Color | Significado |
|--------|-------|-------------|
| Disponible | Verde | Lista para usar |
| Ocupada | Rojo | En uso actualmente |
| Mantenimiento | Amarillo | No disponible |
| Offline | Gris | Apagada/desconectada |

### 6.3 Iniciar Sesión

1. Selecciona una estación disponible
2. Ingresa el nombre del cliente
3. El sistema registra la hora de inicio
4. La estación cambia a "Ocupada"

### 6.4 Pausar Sesión

Si el cliente necesita pausa:
1. Haz clic en "Pausar"
2. El tiempo se detiene
3. El cliente puede reanudar cuando quiera

### 6.5 Finalizar Sesión

1. Selecciona la estación ocupada
2. Haz clic en "Finalizar"
3. El sistema calcula:
   - Tiempo total usado
   - Costo basado en hora/tarifa
4. Imprime o muestra el total a pagar

---

## 7. Equipamiento

Control de préstamo de equipos (proyectores, cámaras, etc.).

### 7.1 Ver Equipos

Lista de equipos disponibles con:
- Nombre y descripción
- Número de serie
- Estado actual
- Tarifa por hora/día

### 7.2 Estados de Equipo

| Estado | Color | Significado |
|--------|-------|-------------|
| Disponible | Verde | Listo para prestar |
| En Uso | Rojo | Prestado actualmente |
| Mantenimiento | Amarillo | En reparación |

### 7.3 Prestar Equipo

1. Selecciona un equipo disponible
2. Haz clic en **"Prestar"**
3. Ingresa:
   - Nombre del cliente
   - Duración prevista (minutos)
4. Confirma el préstamo

### 7.4 Devolver Equipo

1. Cuando el cliente devuelve
2. Haz clic en **"Devolver"**
3. El equipo vuelve a estar disponible

### 7.5 Alertas

El sistema muestra alertas cuando:
- Un préstamo expira
- Un equipo está en retraso
- El tiempo está por terminar

---

## 8. Reportes

Módulo de análisis y estadísticas.

### 8.1 Reporte de Dashboard

Estadísticas generales:
- Total de productos
- Productos con stock bajo
- Ventas del día y mes
- Ingresos de cibercafé
- Valor del inventario

### 8.2 Generar Reportes

Selecciona:
- Tipo de reporte
- Rango de fechas
- Categoría (opcional)

### 8.3 Exportar

Los reportes pueden mostrar:
- Totales por período
- Gráficos de tendencia
- Productos más vendidos
- Análisis de inventario

---

## 9. Resolución de Problemas

### No puedo iniciar sesión
- Verifica que el usuario y contraseña sean correctos
- Confirma que el usuario está activo (consulta al admin)
- Limpia las cookies del navegador

### Error al cargar módulos
- Verifica que la base de datos esté funcionando
- Confirma que el servidor PHP esté ejecutándose
- Revisa la consola del navegador (F12) para errores

### No aparecen productos
- Verifica que hay productos dados de alta
- Confirma que el usuario tiene permisos
- Intenta actualizar la página

### Las ventas no restan inventario
- Verifica que el producto tenga stock
- Confirma que la venta se completó correctamente
- Consulta el registro de transacciones

### No puedo crear proveedores/pedidos
- Solo administradores pueden gestionar proveedores
- Verifica tu rol en el sistema

### Error de conexión a la base de datos
- Confirma que MySQL está ejecutándose
- Verifica las credenciales en `api/db.php`
- Asegúrate que la base de datos existe

---

## Acceso Rápido

| Tarea | Dónde ir |
|-------|----------|
| Ver inventario | Módulo Inventario |
| Registrar venta | Botón "Registrar Venta" en Inventario |
| Crear pedido | Módulo Proveedores |
| Iniciar cibercafé | Módulo Cibercontrol |
| Prestar equipo | Módulo Equipamiento |
| Ver estadísticas | Dashboard |

---

## Contacto y Soporte

Para cualquier duda o problema:
1. Consulta este manual
2. Contacta al administrador del sistema
3. Revisa la documentación técnica

**Versión del Sistema**: 1.0
**Última Actualización**: 2026
