# Manual de Usuario - Sistema Micro_ERP Web

Bienvenido al Manual de Usuario Oficial. Este sistema consta de una plataforma web diseñada para la administración sencilla y rápida de Inventarios, Ventas, Préstamos y Trato de Proveedores para su Local/Empresa. Todo funciona desde un único panel (Dashboard) intuitivo.

---

## 1. Acceso al Sistema (Login y Registro)

Al ingresar a la plataforma, se topará con la ventana de inicio de sesión:
- **Iniciar sesión**: Ingrese su Nombre de Usuario y Contraseña para acceder a la terminal de trabajo.
- **Crear una cuenta nueva**: Si no posee credenciales, presione `"¿No tienes cuenta? Regístrate aquí"`. El sistema le pedirá un Nombre, una Contraseña, y fundamentalmente elegir un **Estatus o Rol** (`Administrador` o `Proveedor`).

> **Nota Crítica sobre los Roles:**
> *   `Administrador` (Usted o sus empleados de confianza): Tienen acceso a todo. Almacenes, ventas, cajas registradoras.
> *   `Proveedor` (Terceros distribuidores): Al ingresar, el sistema los bloqueará y derivará *exclusivamente* a su único apartado permitido, el módulo de **Pedidos a Proveedores**. No podrán husmear sus ventas totales, finanzas, u otros módulos críticos.

---

## 2. Dashboard (Panel Principal del Administrador)

Este es el cerebro del negocio. Visualizará en tiempo real:
- Ingresos Totales (Ventas a lo largo del tiempo).
- Total de Productos guardados, cantidad de equipos prestados, y **Alertas en rojo señalándole cuántos productos tienen "Stock Bajo (< 10)"**.
- **Registro de Ventas Recientes:** Una tabla de los últimos despachos monetarios realizados, a quienes, fecha y totales recolectados.

---

## 3. Módulo de Inventario (Almacén Central)

*Disponible solo para Administradores.* Este panel enlista todo lo que el local vende.

**Botones Clave:**
1. **[+ Nuevo Producto]**: Permite registrar a la base de datos de la empresa un ítem completamente inédito ("Galletas de Limón").
2. **[Ajustar] (Botón Azul en la tabla)**: Úselo cuando deba agregar manualmente cargamento extra o hacer devoluciones sin registrarlos como ventas directas de caja.
3. **[Eliminar] (Botón Rojo en la tabla)**: Eliminará ese artículo para siempre. **¡Precaución!** Esto hará desaparecer históricamente de todos los libros de cajas los registros previos asociados a ventas de ese producto en específico.
4. **[Registrar Venta] (Botón Naranja Principal)**: Este el corazón del negocio (Punto de Venta o POS). Al ser presionado, elija rápidamente de la lista desplegable el artículo que un cliente está solicitando frente el mostrador, ingrese la cantidad y confirme. **Esta acción restará matemáticamente el inventario del local en tiempo real.**

---

## 4. Módulo de Pedidos a Proveedores (Compras)

*Disponible para Administradores y Proveedores.* Aquí, la comunicación externa a interno ocurre. Todo local necesita resurtirse. 

**Flujo y pasos para efectuar re-surtido de Stocks:**
1. Alguien debe presionar **[+ Nuevo Pedido al Proveedor]** y escoger el artículo a surtir. 
   - El *Proveedor* solo genera una petición genérica. El *Administrador* inclusive puede seleccionar el "Número de ID" específico de un proveedor para exigirle mercancías.
2. El Pedido nace en estado **"Pendiente"** de color Naranja.
   - El *Proveedor* tendrá un botón de "Cancelar", y otro de "Marcar Enviado".
   - El *Administrador* no puede aprobarse las cosas a si mismo, solo observará y podrá cancelar la solicitud de compra.
3. El *Proveedor* sube el cargamento de mercancía al camión repartidor y desde su computadora en el sistema aprieta **"Marcar Enviado"**.
   - El estado del pedimento pasa a color Azul "En Camino".
4. El camión llega al local. El *Administrador* lo inspecciona, abre el sistema y presiona el botón Verde **Recibir y Actualizar Stock**. 
   - ¡Magia! El evento se clausura en "Completado", cerrando el documento y todos sus "ítems" en cuestión fueron agregados y sumados velozmente al **Inventario**.

---

## 5. Módulo de Equipamiento Prestado

Este menú es independiente de las ventas y funge para el control de "Préstamo de Utilería" y tiempo prestado a usuarios locales (ej. Cybercafés prestando computadoras, Gimnasios ofreciendo Cintas Estáticas de cardio por 30 minutos, billares prestando mesas, etc.).

**Acciones Permitidas:**
- **[+ Nuevo Equipo]**: Dé de alta una Activo local (Ej. "Mesa de Billar N° 4"). Aparecerá rotulada en verde como "Disponible".
- **[En Mantenimiento] (Botón Naranja)**: Si el equipo de rompió, presiónelo. Quedará rotulado en gris/amarillo de manera permanente por lo que será bloqueado para poder prestarse a clientes hasta que el botón **[Hacer Disponible]** sea revertido.
- **[Registrar Préstamo]**: Si hay un equipo Verde (Disponible), puede cedérselo a un Nombre de Cliente predeterminado estipulando en un reloj numérico `"Minutos que durará el uso"`.
- **Reloj Automático (Timer)**: Una vez prestado el equipo pasará a estado Rojo "En Uso", el contador interno empezará y usted puede seguir atendiendo otros menús de inventario. Cuando en segundo plano el tiempo final recaiga a "0"... el sistema disparará un ruido y una molesta Alerta en el centro de su navegador (`"Ej: Tiempo expirado de PC Master Número 1."`) para que le ordene al cliente su devolución, presione **"Marcar Devuelto"** y termine el préstamo. Así de simple.
