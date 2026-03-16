// js/app.js
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
            
            // Default view
            if (this.user.role === 'admin') {
                this.navigate('dashboard');
            } else {
                this.navigate('providers');
            }

            // Global listeners
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
                { id: 'equipment', icon: '💻', text: 'Equipamiento' }
            ];
        } else if (this.user.role === 'provider') {
            links = [
                { id: 'providers', icon: '🚚', text: 'Mis Pedidos & Stock' }
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

        // Initialize view specific logic
        if (viewId === 'dashboard') this.loadDashboard();
        if (viewId === 'inventory' && typeof Inventory !== 'undefined') Inventory.init();
        if (viewId === 'providers' && typeof Provider !== 'undefined') Provider.init();
        if (viewId === 'equipment' && typeof Equipment !== 'undefined') Equipment.init();
    },

    loadDashboard: async function() {
        try {
            const res = await fetch('api/dashboard.php?action=stats');
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            // Stats
            const formatMoney = (val) => '$' + parseFloat(val).toFixed(2);
            document.getElementById('dashboardStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-title">Ventas Totales</div>
                    <div class="stat-value text-success">${formatMoney(data.stats.total_revenue)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Productos en Inventario</div>
                    <div class="stat-value">${data.stats.total_products}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Alertas de Stock Bajo</div>
                    <div class="stat-value ${data.stats.low_stock > 0 ? 'text-danger' : 'text-success'}">${data.stats.low_stock}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Equipos en Uso</div>
                    <div class="stat-value text-warning">${data.stats.equipment_in_use}</div>
                </div>
            `;

            // Recent sales
            const tbody = document.getElementById('recentSalesTable');
            if (data.recent_sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay ventas registradas</td></tr>';
            } else {
                tbody.innerHTML = data.recent_sales.map(s => `
                    <tr>
                        <td>#${s.id}</td>
                        <td class="text-success" style="font-weight: 600;">${formatMoney(s.total_amount)}</td>
                        <td class="text-muted">${new Date(s.created_at).toLocaleString()}</td>
                    </tr>
                `).join('');
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

    // Modal Utilities
    showModal: function(title, contentHtml) {
        const container = document.getElementById('modalContainer');
        container.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" onclick="app.closeModal()">&times;</button>
                </div>
                ${contentHtml}
            </div>
        `;
        container.classList.add('active');
    },

    closeModal: function() {
        const container = document.getElementById('modalContainer');
        container.classList.remove('active');
        container.innerHTML = '';
    }
};

window.addEventListener('DOMContentLoaded', () => app.init());
