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

    loadDashboard: function() {
        var self = this;
        var formatMoney = function(val) { return '$' + parseFloat(val || 0).toFixed(2); };
        
        // Load main stats from reports API
        fetch('api/reports.php?action=dashboard')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    console.error('Dashboard error:', data.error);
                    return;
                }
                document.getElementById('dashboardStats').innerHTML = 
                    '<div class="stat-card"><div class="stat-title">Ventas del Día</div><div class="stat-value text-success">' + formatMoney(data.stats.today_sales) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Ventas del Mes</div><div class="stat-value">' + formatMoney(data.stats.month_sales) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Cibercafé Hoy</div><div class="stat-value text-primary">' + formatMoney(data.stats.today_cyber) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Servicios Hoy</div><div class="stat-value text-primary">' + formatMoney(data.stats.today_services) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Sesiones Activas</div><div class="stat-value text-warning">' + data.stats.active_cyber_sessions + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Productos</div><div class="stat-value">' + data.stats.total_products + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Stock Bajo</div><div class="stat-value ' + (data.stats.low_stock > 0 ? 'text-danger' : 'text-success') + '">' + data.stats.low_stock + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Equipos en Uso</div><div class="stat-value">' + data.stats.equipment_in_use + '</div></div>';
            })
            .catch(function(e) {
                console.error('Dashboard stats error:', e);
            });

        // Recent sales
        fetch('api/dashboard.php?action=stats')
            .then(function(res) { return res.json(); })
            .then(function(d) {
                var tbody = document.getElementById('recentSalesTable');
                if (!tbody) return;
                if (d.recent_sales && d.recent_sales.length > 0) {
                    tbody.innerHTML = d.recent_sales.map(function(s) {
                        return '<tr><td>#' + s.id + '</td><td class="text-success">' + formatMoney(s.total_amount) + '</td><td class="text-muted">' + new Date(s.created_at).toLocaleDateString() + '</td></tr>';
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin ventas</td></tr>';
                }
            })
            .catch(function() {
                var tbody = document.getElementById('recentSalesTable');
                if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin acceso</td></tr>';
            });

        // Active sessions
        fetch('api/cyber.php?action=active_sessions')
            .then(function(res) { return res.json(); })
            .then(function(d) {
                var tbody = document.getElementById('activeSessionsTable');
                if (!tbody) return;
                if (d.sessions && d.sessions.length > 0) {
                    tbody.innerHTML = d.sessions.map(function(s) {
                        return '<tr><td><strong>' + (s.station_name || 'Estación') + '</strong></td><td>' + (s.customer_name || 'Cliente') + '</td><td>' + (s.elapsed_formatted || '0:00') + '</td></tr>';
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin sesiones activas</td></tr>';
                }
            })
            .catch(function() {
                var tbody = document.getElementById('activeSessionsTable');
                if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin acceso</td></tr>';
            });

        // Low stock
        fetch('api/inventory.php?action=low_stock')
            .then(function(res) { return res.json(); })
            .then(function(d) {
                var tbody = document.getElementById('lowStockTable');
                if (!tbody) return;
                if (d.products && d.products.length > 0) {
                    tbody.innerHTML = d.products.slice(0, 5).map(function(p) {
                        return '<tr><td>' + p.name + '</td><td><span class="badge badge-danger">' + p.stock + '</span></td></tr>';
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Sin stock bajo</td></tr>';
                }
            })
            .catch(function() {
                var tbody = document.getElementById('lowStockTable');
                if (tbody) tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Sin acceso</td></tr>';
            });

        // Pending orders
        fetch('api/providers.php?action=list_orders&status=pending')
            .then(function(res) { return res.json(); })
            .then(function(d) {
                var tbody = document.getElementById('pendingOrdersTable');
                if (!tbody) return;
                if (d.orders && d.orders.length > 0) {
                    tbody.innerHTML = d.orders.slice(0, 5).map(function(o) {
                        return '<tr><td>#' + o.order_number + '</td><td><span class="badge badge-warning">Pendiente</span></td><td class="text-muted">' + new Date(o.created_at).toLocaleDateString() + '</td></tr>';
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin pedidos pendientes</td></tr>';
                }
            })
            .catch(function() {
                var tbody = document.getElementById('pendingOrdersTable');
                if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin acceso</td></tr>';
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
        var self = this;
        var categoryOptions = Inventory.categories.map(function(c) {
            return '<option value="' + c.id + '">' + self.escapeHtml(c.name) + '</option>';
        }).join('');
        
        var html = '<form onsubmit="event.preventDefault(); window.createProduct()">' +
            '<div class="form-group"><label class="form-label">Nombre del Producto *</label>' +
            '<input type="text" id="addName" class="form-control" placeholder="Ej: Laptop Dell XPS 15" required></div>' +
            '<div class="form-group"><label class="form-label">Descripción</label>' +
            '<textarea id="addDesc" class="form-control" placeholder="Descripción detallada del producto"></textarea></div>' +
            '<div class="form-group"><label class="form-label">Categoría</label>' +
            '<select id="addCategory" class="form-control">' +
            '<option value="">Sin categoría</option>' + categoryOptions + '</select></div>' +
            '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">Precio de Venta *</label>' +
            '<input type="number" id="addPrice" class="form-control" step="0.01" min="0" placeholder="0.00" required></div>' +
            '<div class="form-group" style="flex:1;"><label class="form-label">Precio de Costo</label>' +
            '<input type="number" id="addCost" class="form-control" step="0.01" min="0" placeholder="0.00"></div></div>' +
            '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">Stock Inicial</label>' +
            '<input type="number" id="addStock" class="form-control" min="0" value="0"></div>' +
            '<div class="form-group" style="flex:1;"><label class="form-label">Stock Mínimo</label>' +
            '<input type="number" id="addMinStock" class="form-control" min="0" value="5"></div>' +
            '<div class="form-group" style="flex:1;"><label class="form-label">Stock Máximo</label>' +
            '<input type="number" id="addMaxStock" class="form-control" min="0" value="100"></div></div>' +
            '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">Unidad</label>' +
            '<select id="addUnit" class="form-control"><option value="unidad">Unidad</option>' +
            '<option value="pieza">Pieza</option><option value="kg">Kilogramo</option>' +
            '<option value="litro">Litro</option><option value="metro">Metro</option>' +
            '<option value="caja">Caja</option><option value="paquete">Paquete</option></select></div>' +
            '<div class="form-group" style="flex:1;"><label class="form-label">Código de Barras</label>' +
            '<input type="text" id="addBarcode" class="form-control" placeholder="Código de barras"></div></div>' +
            '<div class="form-group"><label class="form-label">Ubicación/Almacén</label>' +
            '<input type="text" id="addLocation" class="form-control" placeholder="Ej: Estante A-3"></div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">Crear Producto</button></div></form>';
        app.showModal('Nuevo Producto', html);
    },

    showSellModal: function() {
        var self = this;
        fetch('api/inventory.php?action=list')
            .then(function(res) { return res.json(); })
            .then(function(d) {
                var products = d.products || [];
                var available = products.filter(function(p) { return p.stock > 0; });
                
                var options = available.map(function(p) {
                    return '<option value="' + p.id + '" data-price="' + p.price + '" data-stock="' + p.stock + '">' + 
                           self.escapeHtml(p.name) + ' ($' + parseFloat(p.price).toFixed(2) + ') - Stock: ' + p.stock + '</option>';
                }).join('');
                
                var html = '<form onsubmit="event.preventDefault(); window.executeSale()">' +
                    '<div class="form-group"><label class="form-label">Producto *</label>' +
                    '<select id="sellProd" class="form-control" required onchange="app.updateSaleTotal()">' +
                    '<option value="">-- Seleccionar producto --</option>' + options + '</select></div>' +
                    '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">Cantidad *</label>' +
                    '<input type="number" id="sellQty" class="form-control" min="1" value="1" required onchange="app.updateSaleTotal()"></div>' +
                    '<div class="form-group" style="flex:1;"><label class="form-label">Precio Unitario</label>' +
                    '<input type="number" id="sellPrice" class="form-control" step="0.01" readonly></div></div>' +
                    '<div class="form-group"><label class="form-label">Nombre del Cliente</label>' +
                    '<input type="text" id="sellCustomer" class="form-control" placeholder="Cliente mostrador"></div>' +
                    '<div class="form-group"><label class="form-label">Método de Pago</label>' +
                    '<select id="sellPayment" class="form-control">' +
                    '<option value="cash">💵 Efectivo</option>' +
                    '<option value="card">💳 Tarjeta</option>' +
                    '<option value="transfer">🏦 Transferencia</option></select></div>' +
                    '<div style="background:#1e293b;padding:1rem;border-radius:0.5rem;margin:1rem 0;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:1.25rem;">' +
                    '<strong>Total:</strong><strong id="saleTotal" style="color:#10b981;">$0.00</strong></div></div>' +
                    '<div class="modal-footer">' +
                    '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
                    '<button type="submit" class="btn btn-success">💰 Completar Venta</button></div></form>';
                app.showModal('Registrar Venta', html);
            })
            .catch(function(e) {
                app.showAlert('Error cargando productos', 'error');
            });
    },

    updateSaleTotal: function() {
        var prodSelect = document.getElementById('sellProd');
        var qtyInput = document.getElementById('sellQty');
        var priceInput = document.getElementById('sellPrice');
        var totalEl = document.getElementById('saleTotal');
        
        if (!prodSelect || !qtyInput || !priceInput || !totalEl) return;
        
        var selected = prodSelect.selectedOptions[0];
        var price = parseFloat(selected ? selected.dataset.price : 0);
        var qty = parseInt(qtyInput.value) || 0;
        var stock = parseInt(selected ? selected.dataset.stock : 0);
        
        priceInput.value = price.toFixed(2);
        
        if (qty > stock) {
            qtyInput.value = stock;
            qty = stock;
            app.showAlert('Stock máximo disponible: ' + stock, 'warning');
        }
        
        var total = price * qty;
        totalEl.textContent = '$' + total.toFixed(2);
    },

    escapeHtml: function(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.createProduct = function() {
    var name = document.getElementById('addName').value;
    if (!name) {
        app.showAlert('El nombre es requerido', 'error');
        return;
    }
    
    var payload = {
        name: name,
        description: document.getElementById('addDesc').value,
        category_id: document.getElementById('addCategory').value || null,
        price: parseFloat(document.getElementById('addPrice').value) || 0,
        cost_price: parseFloat(document.getElementById('addCost').value) || 0,
        stock: parseInt(document.getElementById('addStock').value) || 0,
        min_stock: parseInt(document.getElementById('addMinStock').value) || 5,
        max_stock: parseInt(document.getElementById('addMaxStock').value) || 100,
        unit: document.getElementById('addUnit').value || 'unidad',
        barcode: document.getElementById('addBarcode').value,
        location: document.getElementById('addLocation').value
    };
    
    fetch('api/inventory.php?action=add_product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            app.showAlert('Producto creado: ' + data.message);
            app.closeModal();
            if (typeof Inventory !== 'undefined') Inventory.init();
        } else {
            throw new Error(data.error || 'Error desconocido');
        }
    })
    .catch(function(e) {
        app.showAlert(e.message, 'error');
    });
};

window.executeSale = function() {
    var prodId = parseInt(document.getElementById('sellProd').value);
    var qty = parseInt(document.getElementById('sellQty').value);
    var price = parseFloat(document.getElementById('sellPrice').value);
    var customer = document.getElementById('sellCustomer').value || 'Cliente Mostrador';
    var payment = document.getElementById('sellPayment').value;
    
    if (!prodId || !qty) {
        app.showAlert('Seleccione un producto y cantidad', 'error');
        return;
    }
    
    fetch('api/inventory.php?action=sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items: [{ product_id: prodId, quantity: qty, price: price }],
            customer_name: customer,
            payment_method: payment
        })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            app.showAlert('Venta registrada - Factura: ' + data.invoice);
            app.closeModal();
            if (typeof Inventory !== 'undefined') Inventory.init();
        } else {
            throw new Error(data.error || 'Error desconocido');
        }
    })
    .catch(function(e) {
        app.showAlert(e.message, 'error');
    });
};

window.addEventListener('DOMContentLoaded', () => app.init());
