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
            document.getElementById('userNameDisplay').textContent = this.user.username;
            document.getElementById('userRoleBadge').textContent = this.user.role;
            
            this.setupNavigation();
            
            if (this.user.role === 'admin') {
                this.navigate('dashboard');
            } else {
                this.navigate('inventory');
            }

            document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        } catch(e) {
            console.error('Init Error:', e);
            window.location.href = 'index.html';
        }
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
                { id: 'providers', icon: '🚚', text: 'Proveedores' }
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
            'providers': 'Proveedores',
            'cyber': 'Cibercontrol',
            'reports': 'Reportes',
            'equipment': 'Equipamiento'
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
            this.showAlert('Vista actualizada');
        }
    },

    loadDashboard: async function() {
        const formatMoney = (val) => '$' + parseFloat(val || 0).toFixed(2);
        
        // Load main stats from reports API
        try {
            const res = await fetch('api/reports.php?action=dashboard');
            const data = await res.json();

            if (!data.error) {
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
                        <div class="stat-title">Equipos en Uso</div>
                        <div class="stat-value">${data.stats.equipment_in_use}</div>
                    </div>
                `;
            }
        } catch (e) {
            console.error('Dashboard stats error:', e);
        }

        // Recent sales (admin only)
        fetch('api/dashboard.php?action=stats')
            .then(r => r.json())
            .then(d => {
                const tbody = document.getElementById('recentSalesTable');
                if (d.recent_sales && d.recent_sales.length > 0) {
                    tbody.innerHTML = d.recent_sales.map(s => `
                        <tr>
                            <td>#${s.id}</td>
                            <td class="text-success">${formatMoney(s.total_amount)}</td>
                            <td class="text-muted">${new Date(s.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin ventas</td></tr>';
                }
            }).catch(() => {
                document.getElementById('recentSalesTable').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin acceso</td></tr>';
            });

        // Active sessions
        fetch('api/cyber.php?action=active_sessions')
            .then(r => r.json())
            .then(d => {
                const tbody = document.getElementById('activeSessionsTable');
                if (d.sessions && d.sessions.length > 0) {
                    tbody.innerHTML = d.sessions.map(s => `
                        <tr>
                            <td><strong>${s.station_name}</strong></td>
                            <td>${s.customer_name || 'Cliente'}</td>
                            <td>${s.elapsed_formatted || '0:00'}</td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin sesiones activas</td></tr>';
                }
            }).catch(() => {
                document.getElementById('activeSessionsTable').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin acceso</td></tr>';
            });

        // Low stock
        fetch('api/inventory.php?action=low_stock')
            .then(r => r.json())
            .then(d => {
                const tbody = document.getElementById('lowStockTable');
                if (d.products && d.products.length > 0) {
                    tbody.innerHTML = d.products.slice(0, 5).map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td><span class="badge badge-danger">${p.stock}</span></td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Sin stock bajo</td></tr>';
                }
            }).catch(() => {
                document.getElementById('lowStockTable').innerHTML = '<tr><td colspan="2" class="text-center text-muted">Sin acceso</td></tr>';
            });

        // Pending orders
        fetch('api/providers.php?action=list_orders&status=pending')
            .then(r => r.json())
            .then(d => {
                const tbody = document.getElementById('pendingOrdersTable');
                if (d.orders && d.orders.length > 0) {
                    tbody.innerHTML = d.orders.slice(0, 5).map(o => `
                        <tr>
                            <td>#${o.order_number}</td>
                            <td><span class="badge badge-warning">Pendiente</span></td>
                            <td class="text-muted">${new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin pedidos pendientes</td></tr>';
                }
            }).catch(() => {
                document.getElementById('pendingOrdersTable').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin acceso</td></tr>';
            });
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
                    <label class="form-label">Nombre *</label>
                    <input type="text" id="addName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Precio</label>
                    <input type="number" id="addPrice" class="form-control" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Stock Inicial</label>
                    <input type="number" id="addStock" class="form-control" min="0" value="0">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Crear</button>
                </div>
            </form>
        `;
        app.showModal('Nuevo Producto', html);
    },

    showSellModal: function() {
        fetch('api/inventory.php?action=list')
            .then(r => r.json())
            .then(d => {
                const products = d.products || [];
                const available = products.filter(p => p.stock > 0);
                
                const html = `
                    <form onsubmit="event.preventDefault(); window.executeSale()">
                        <div class="form-group">
                            <label class="form-label">Producto</label>
                            <select id="sellProd" class="form-control" required>
                                <option value="">-- Seleccionar --</option>
                                ${available.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} ($${p.price})</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Cantidad</label>
                            <input type="number" id="sellQty" class="form-control" min="1" value="1" required>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-warning">Vender</button>
                        </div>
                    </form>
                `;
                app.showModal('Registrar Venta', html);
            });
    }
};

window.createProduct = async function() {
    const payload = {
        name: document.getElementById('addName').value,
        price: parseFloat(document.getElementById('addPrice').value),
        stock: parseInt(document.getElementById('addStock').value) || 0
    };
    try {
        const res = await fetch('api/inventory.php?action=add_product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            app.showAlert('Producto creado');
            app.closeModal();
            if (typeof Inventory !== 'undefined') Inventory.init();
        } else throw new Error(data.error);
    } catch (e) {
        app.showAlert(e.message, 'error');
    }
};

window.executeSale = async function() {
    const prodId = parseInt(document.getElementById('sellProd').value);
    const qty = parseInt(document.getElementById('sellQty').value);
    const sel = document.getElementById('sellProd');
    const price = parseFloat(sel.selectedOptions[0].dataset.price);

    try {
        const res = await fetch('api/inventory.php?action=sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ product_id: prodId, quantity: qty, price: price }] })
        });
        const data = await res.json();
        if (data.success) {
            app.showAlert(`Venta registrada - ${data.invoice}`);
            app.closeModal();
            if (typeof Inventory !== 'undefined') Inventory.init();
        } else throw new Error(data.error);
    } catch (e) {
        app.showAlert(e.message, 'error');
    }
};

window.addEventListener('DOMContentLoaded', () => app.init());
