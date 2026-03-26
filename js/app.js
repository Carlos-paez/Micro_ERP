// js/app.js - Main Application Controller
const app = {
    user: null,
    currentView: null,

    init: async function() {
        try {
            const res = await fetch('api/auth.php?action=session');
            const data = await res.json();
            
            if (!data.authenticated) {
                window.location.href = 'index.html';
                return;
            }
            
            this.user = data.user;
            document.getElementById('appLayout').classList.remove('hidden');
            document.getElementById('userNameDisplay').textContent = this.user.username || this.user.full_name || 'Usuario';
            document.getElementById('userRoleBadge').textContent = this.getRoleLabel(this.user.role);
            
            this.setupNavigation();
            
            if (this.user.role === 'admin') {
                this.navigate('dashboard');
            } else if (this.user.role === 'provider') {
                this.navigate('providers');
            } else {
                this.navigate('cyber');
            }

            document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        } catch(e) {
            console.error('Init Error:', e);
            window.location.href = 'index.html';
        }
    },

    getRoleLabel: function(role) {
        const labels = {
            'admin': 'Administrador',
            'provider': 'Proveedor',
            'operator': 'Operador'
        };
        return labels[role] || role;
    },

    setupNavigation: function() {
        const nav = document.getElementById('sidebarNav');
        let links = [];

        if (this.user.role === 'admin') {
            links = [
                { id: 'dashboard', icon: '📊', text: 'Dashboard' },
                { id: 'inventory', icon: '📦', text: 'Inventario' },
                { id: 'providers', icon: '🚚', text: 'Proveedores' },
                { id: 'cyber', icon: '💻', text: 'Cibercontrol' },
                { id: 'reports', icon: '📈', text: 'Reportes' },
                { id: 'equipment', icon: '🔧', text: 'Equipamiento' }
            ];
        } else if (this.user.role === 'provider') {
            links = [
                { id: 'providers', icon: '🚚', text: 'Mis Pedidos' }
            ];
        } else if (this.user.role === 'operator') {
            links = [
                { id: 'cyber', icon: '💻', text: 'Cibercontrol' },
                { id: 'inventory', icon: '📦', text: 'Inventario' }
            ];
        }

        nav.innerHTML = links.map(l => `
            <a class="nav-item" data-target="${l.id}" onclick="app.navigate('${l.id}')">
                <span style="margin-right: 10px;">${l.icon}</span> ${l.text}
            </a>
        `).join('');
    },

    navigate: function(viewId) {
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.target === viewId);
        });

        const template = document.getElementById(`tpl-${viewId}`);
        if (!template) return;

        document.getElementById('contentArea').innerHTML = template.innerHTML;
        this.currentView = viewId;

        this.initView(viewId);
    },

    initView: function(viewId) {
        const titles = {
            'dashboard': 'Panel de Control',
            'inventory': 'Gestión de Inventario',
            'providers': 'Gestión de Proveedores',
            'cyber': 'Cibercontrol',
            'reports': 'Reportes y Estadísticas',
            'equipment': 'Gestión de Equipos'
        };
        document.getElementById('topbarTitle').textContent = titles[viewId] || viewId;

        switch(viewId) {
            case 'dashboard': this.loadDashboard(); break;
            case 'inventory': if (typeof Inventory !== 'undefined') Inventory.init(); break;
            case 'providers': if (typeof Providers !== 'undefined') Providers.init(); break;
            case 'cyber': if (typeof Cyber !== 'undefined') Cyber.init(); break;
            case 'reports': if (typeof Reports !== 'undefined') Reports.init(); break;
            case 'equipment': if (typeof Equipment !== 'undefined') Equipment.init(); break;
        }
    },

    refreshCurrentView: function() {
        if (this.currentView) {
            this.initView(this.currentView);
            app.showAlert('Vista actualizada');
        }
    },

    loadDashboard: async function() {
        try {
            const res = await fetch('api/dashboard.php?action=stats');
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            const formatMoney = (val) => '$' + parseFloat(val || 0).toFixed(2);
            
            document.getElementById('dashboardStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-title">Ventas del Día</div>
                    <div class="stat-value text-success">${formatMoney(data.stats.today_sales)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Ventas del Mes</div>
                    <div class="stat-value">${formatMoney(data.stats.month_sales)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Cibercafé Hoy</div>
                    <div class="stat-value text-primary">${formatMoney(data.stats.today_cyber)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Servicios Hoy</div>
                    <div class="stat-value text-primary">${formatMoney(data.stats.today_services)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Sesiones Activas</div>
                    <div class="stat-value text-warning">${data.stats.active_cyber_sessions}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Productos</div>
                    <div class="stat-value">${data.stats.total_products}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Stock Bajo</div>
                    <div class="stat-value ${data.stats.low_stock > 0 ? 'text-danger' : 'text-success'}">${data.stats.low_stock}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Pedidos Pendientes</div>
                    <div class="stat-value text-warning">${data.stats.pending_orders}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Valor Inventario</div>
                    <div class="stat-value">${formatMoney(data.stats.inventory_value)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Equipos en Uso</div>
                    <div class="stat-value">${data.stats.equipment_in_use}</div>
                </div>
            `;

            const tbody = document.getElementById('recentSalesTable');
            if (!data.recent_sales || data.recent_sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay ventas registradas</td></tr>';
            } else {
                tbody.innerHTML = data.recent_sales.map(s => `
                    <tr>
                        <td>#${s.id}</td>
                        <td class="text-success" style="font-weight: 600;">${formatMoney(s.total_amount)}</td>
                        <td><span class="badge badge-secondary">${s.payment_method || 'cash'}</span></td>
                        <td class="text-muted">${new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('');
            }

            const sessionsTable = document.getElementById('activeSessionsTable');
            if (!data.active_sessions || data.active_sessions.length === 0) {
                sessionsTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay sesiones activas</td></tr>';
            } else {
                sessionsTable.innerHTML = data.active_sessions.map(s => `
                    <tr>
                        <td><strong>${s.station_name}</strong></td>
                        <td>${s.customer_name || 'Cliente'}</td>
                        <td class="text-muted">${new Date(s.start_time).toLocaleTimeString()}</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="endSession(${s.id})">Finalizar</button>
                        </td>
                    </tr>
                `).join('');
            }

            const lowStockTable = document.getElementById('lowStockTable');
            if (!data.low_stock_products || data.low_stock_products.length === 0) {
                lowStockTable.innerHTML = '<tr><td colspan="4" class="text-center text-success">✓ Inventario saludable</td></tr>';
            } else {
                lowStockTable.innerHTML = data.low_stock_products.map(p => `
                    <tr>
                        <td>${p.name}</td>
                        <td><span class="badge badge-danger">${p.stock}</span></td>
                        <td>${p.min_stock}</td>
                        <td>${p.category || '-'}</td>
                    </tr>
                `).join('');
            }

            const ordersTable = document.getElementById('recentOrdersTable');
            if (!data.recent_orders || data.recent_orders.length === 0) {
                ordersTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay pedidos</td></tr>';
            } else {
                ordersTable.innerHTML = data.recent_orders.map(o => {
                    const statusClass = o.status === 'completed' ? 'badge-success' : 
                                       o.status === 'pending' ? 'badge-warning' : 
                                       o.status === 'cancelled' ? 'badge-danger' : 'badge-primary';
                    return `
                        <tr>
                            <td>#${o.id}</td>
                            <td>${formatMoney(o.total_amount)}</td>
                            <td><span class="badge ${statusClass}">${o.status}</span></td>
                            <td class="text-muted">${new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                    `;
                }).join('');
            }

            const dashDateFrom = document.getElementById('dashDateFrom');
            const dashDateTo = document.getElementById('dashDateTo');
            if (dashDateFrom && dashDateTo) {
                const today = new Date().toISOString().split('T')[0];
                const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                dashDateFrom.value = monthStart;
                dashDateTo.value = today;
            }

        } catch (e) {
            this.showAlert(e.message, 'error');
        }
    },

    logout: async function() {
        await fetch('api/auth.php?action=logout', { method: 'POST' });
        window.location.href = 'index.html';
    },

    showAlert: function(msg, type = 'success') {
        const alertsDiv = document.getElementById('alerts');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = msg;
        alertsDiv.appendChild(alert);

        setTimeout(() => alert.remove(), 4000);
    },

    showModal: function(title, contentHtml) {
        const container = document.getElementById('modalContainer');
        container.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" onclick="app.closeModal()">&times;</button>
                </div>
                <div class="modal-body">${contentHtml}</div>
            </div>
        `;
        container.classList.add('active');
    },

    closeModal: function() {
        const container = document.getElementById('modalContainer');
        container.classList.remove('active');
        setTimeout(() => container.innerHTML = '', 300);
    },

    showAddProductModal: function() {
        const html = `
            <form onsubmit="event.preventDefault(); window.createProduct()">
                <div class="form-group">
                    <label class="form-label">SKU</label>
                    <input type="text" id="addSku" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" id="addName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Descripción</label>
                    <input type="text" id="addDesc" class="form-control">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Precio Venta</label>
                        <input type="number" id="addPrice" class="form-control" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Precio Costo</label>
                        <input type="number" id="addCost" class="form-control" step="0.01" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Stock</label>
                        <input type="number" id="addStock" class="form-control" min="0" value="0" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Stock Mínimo</label>
                        <input type="number" id="addMinStock" class="form-control" min="0" value="5">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Ubicación</label>
                    <input type="text" id="addLocation" class="form-control">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Crear Producto</button>
                </div>
            </form>
        `;
        app.showModal('Nuevo Producto', html);
    },

    showSellModal: function() {
        if (typeof Inventory === 'undefined' || !Inventory.products || Inventory.products.length === 0) {
            app.showAlert('No hay productos disponibles', 'warning');
            return;
        }

        const html = `
            <form onsubmit="event.preventDefault(); window.executeSale()">
                <div class="form-group">
                    <label class="form-label">Cliente</label>
                    <input type="text" id="sellCustomer" class="form-control" placeholder="Nombre del cliente">
                </div>
                <div id="sellItems">
                    <div class="sell-item-row">
                        <select class="form-control sell-product" onchange="window.updateSaleTotal()">
                            <option value="">-- Seleccionar producto --</option>
                            ${Inventory.products.filter(p => p.stock > 0).map(p => 
                                `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}">${p.name} ($${p.price} | Stock: ${p.stock})</option>`
                            ).join('')}
                        </select>
                        <input type="number" class="form-control sell-qty" placeholder="Cantidad" min="1" value="1" oninput="window.updateSaleTotal()">
                        <span class="sell-subtotal">$0.00</span>
                    </div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.addSellItem()">+ Agregar producto</button>
                
                <div class="sale-total">
                    <span>Total:</span>
                    <span id="saleTotalDisplay" class="text-success">$0.00</span>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Método de Pago</label>
                    <select id="sellPayment" class="form-control">
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-warning">Registrar Venta</button>
                </div>
            </form>
        `;
        app.showModal('Registrar Venta', html);
    }
};

window.addSellItem = function() {
    const container = document.getElementById('sellItems');
    const div = document.createElement('div');
    div.className = 'sell-item-row';
    div.innerHTML = `
        <select class="form-control sell-product" onchange="window.updateSaleTotal()">
            <option value="">-- Seleccionar producto --</option>
            ${Inventory.products.filter(p => p.stock > 0).map(p => 
                `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}">${p.name} ($${p.price} | Stock: ${p.stock})</option>`
            ).join('')}
        </select>
        <input type="number" class="form-control sell-qty" placeholder="Cantidad" min="1" value="1" oninput="window.updateSaleTotal()">
        <span class="sell-subtotal">$0.00</span>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove(); window.updateSaleTotal();">×</button>
    `;
    container.appendChild(div);
};

window.updateSaleTotal = function() {
    const rows = document.querySelectorAll('.sell-item-row');
    let total = 0;
    
    rows.forEach(row => {
        const sel = row.querySelector('.sell-product');
        const qty = parseInt(row.querySelector('.sell-qty').value) || 0;
        const subtotalEl = row.querySelector('.sell-subtotal');
        
        if (sel.value) {
            const price = parseFloat(sel.selectedOptions[0].dataset.price) || 0;
            const maxStock = parseInt(sel.selectedOptions[0].dataset.stock) || 0;
            const actualQty = Math.min(qty, maxStock);
            const subtotal = price * actualQty;
            subtotalEl.textContent = '$' + subtotal.toFixed(2);
            total += subtotal;
        } else {
            subtotalEl.textContent = '$0.00';
        }
    });
    
    document.getElementById('saleTotalDisplay').textContent = '$' + total.toFixed(2);
};

window.executeSale = async function() {
    const rows = document.querySelectorAll('.sell-item-row');
    const items = [];
    
    rows.forEach(row => {
        const prodId = parseInt(row.querySelector('.sell-product').value);
        const qty = parseInt(row.querySelector('.sell-qty').value) || 0;
        const price = parseFloat(row.querySelector('.sell-product').selectedOptions[0]?.dataset.price) || 0;
        
        if (prodId && qty > 0) {
            items.push({ product_id: prodId, quantity: qty, price: price });
        }
    });
    
    if (items.length === 0) {
        app.showAlert('Agrega al menos un producto', 'error');
        return;
    }
    
    const payload = {
        items: items,
        customer_name: document.getElementById('sellCustomer').value,
        payment_method: document.getElementById('sellPayment').value
    };
    
    try {
        const res = await fetch('api/inventory.php?action=sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            app.showAlert(`Venta registrada - Factura: ${data.invoice}`);
            app.closeModal();
            if (typeof Inventory !== 'undefined') Inventory.loadProducts();
        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        app.showAlert(e.message, 'error');
    }
};

window.createProduct = async function() {
    const payload = {
        sku: document.getElementById('addSku').value,
        name: document.getElementById('addName').value,
        description: document.getElementById('addDesc').value,
        price: parseFloat(document.getElementById('addPrice').value),
        cost_price: parseFloat(document.getElementById('addCost').value) || 0,
        stock: parseInt(document.getElementById('addStock').value) || 0,
        min_stock: parseInt(document.getElementById('addMinStock').value) || 5,
        location: document.getElementById('addLocation').value
    };
    
    try {
        const res = await fetch('api/inventory.php?action=add_product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            app.showAlert('Producto creado exitosamente');
            app.closeModal();
            if (typeof Inventory !== 'undefined') Inventory.loadProducts();
        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        app.showAlert(e.message, 'error');
    }
};

window.addEventListener('DOMContentLoaded', () => app.init());
