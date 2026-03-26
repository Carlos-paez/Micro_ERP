// js/reports.js - Reports and Statistics Module
const Reports = {
    salesData: [],
    cyberData: [],
    productsData: [],
    inventoryData: [],

    init: function() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const dateFromEl = document.getElementById('repDateFrom');
        const dateToEl = document.getElementById('repDateTo');
        
        if (dateFromEl) dateFromEl.value = firstDay.toISOString().split('T')[0];
        if (dateToEl) dateToEl.value = today.toISOString().split('T')[0];
        
        this.loadReport();
    },

    switchTab: function(tabId) {
        document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');
        
        this.loadReport(tabId);
    },

    loadReport: function(tabId) {
        const activeTab = tabId || document.querySelector('.tab.active')?.dataset.tab || 'sales';
        const dateFrom = document.getElementById('repDateFrom')?.value || '';
        const dateTo = document.getElementById('repDateTo')?.value || '';
        
        switch(activeTab) {
            case 'sales': this.loadSalesReport(dateFrom, dateTo); break;
            case 'cyber': this.loadCyberReport(dateFrom, dateTo); break;
            case 'inventory': this.loadInventoryReport(); break;
        }
    },

    loadSalesReport: async function(dateFrom, dateTo) {
        try {
            const res = await fetch(`api/reports.php?action=sales_report&date_from=${dateFrom}&date_to=${dateTo}`);
            const data = await res.json();
            this.salesData = data.data || [];
            
            const totals = data.totals || {};
            
            document.getElementById('salesStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-title">Total Transacciones</div>
                    <div class="stat-value">${totals.total || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Ingresos Totales</div>
                    <div class="stat-value text-success">$${parseFloat(totals.total_amount || 0).toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Ticket Promedio</div>
                    <div class="stat-value">$${totals.total > 0 ? (totals.total_amount / totals.total).toFixed(2) : '0.00'}</div>
                </div>
            `;
            
            const tbody = document.getElementById('salesReportTable');
            if (this.salesData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay datos en este período</td></tr>';
                return;
            }
            
            tbody.innerHTML = this.salesData.map(d => `
                <tr>
                    <td>${d.period}</td>
                    <td>${d.transactions}</td>
                    <td class="text-success">$${parseFloat(d.cash_total || 0).toFixed(2)}</td>
                    <td class="text-primary">$${parseFloat(d.card_total || 0).toFixed(2)}</td>
                    <td class="text-warning">$${parseFloat(d.transfer_total || 0).toFixed(2)}</td>
                    <td class="text-success"><strong>$${parseFloat(d.total || 0).toFixed(2)}</strong></td>
                </tr>
            `).join('');
        } catch (e) {
            app.showAlert('Error cargando reporte de ventas', 'error');
        }
    },

    loadCyberReport: async function(dateFrom, dateTo) {
        try {
            const res = await fetch(`api/reports.php?action=cyber_report&date_from=${dateFrom}&date_to=${dateTo}`);
            const data = await res.json();
            
            const totals = data.totals || {};
            const daily = data.daily || [];
            
            document.getElementById('cyberStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-title">Total Sesiones</div>
                    <div class="stat-value">${totals.total_sessions || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Minutos Totales</div>
                    <div class="stat-value">${Math.round(totals.total_minutes || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Ingresos Totales</div>
                    <div class="stat-value text-success">$${parseFloat(totals.total_revenue || 0).toFixed(2)}</div>
                </div>
            `;
            
            const tbody = document.getElementById('cyberReportTable');
            if (daily.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay datos</td></tr>';
                return;
            }
            
            tbody.innerHTML = daily.map(d => `
                <tr>
                    <td>${d.date}</td>
                    <td>${d.sessions}</td>
                    <td>${Math.round(d.total_minutes)}</td>
                    <td class="text-success"><strong>$${parseFloat(d.total_revenue || 0).toFixed(2)}</strong></td>
                    <td>$${parseFloat(d.avg_ticket || 0).toFixed(2)}</td>
                </tr>
            `).join('');
        } catch (e) {
            app.showAlert('Error cargando reporte de cibercafé', 'error');
        }
    },

    loadTopProducts: async function(dateFrom, dateTo) {
        try {
            const res = await fetch(`api/reports.php?action=top_products&date_from=${dateFrom}&date_to=${dateTo}&limit=20`);
            const data = await res.json();
            this.productsData = data.products || [];
            
            const tbody = document.getElementById('topProductsTable');
            if (this.productsData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay datos</td></tr>';
                return;
            }
            
            tbody.innerHTML = this.productsData.map((p, i) => `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${p.name}</div>
                        ${i < 3 ? `<span class="badge badge-warning">Top ${i + 1}</span>` : ''}
                    </td>
                    <td>${p.sku || '-'}</td>
                    <td>${p.times_sold}</td>
                    <td>${p.total_qty_sold}</td>
                    <td class="text-success"><strong>$${parseFloat(p.total_revenue || 0).toFixed(2)}</strong></td>
                </tr>
            `).join('');
        } catch (e) {
            app.showAlert('Error cargando productos', 'error');
        }
    },

    loadInventoryReport: async function() {
        try {
            const res = await fetch('api/reports.php?action=inventory_report');
            const data = await res.json();
            
            const byCategory = data.by_category || [];
            const totals = data.totals || {};
            const lowStock = data.low_stock || [];
            
            document.getElementById('invStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-title">Total Productos</div>
                    <div class="stat-value">${totals.total_products || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Unidades en Stock</div>
                    <div class="stat-value">${totals.total_units || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Valor del Inventario</div>
                    <div class="stat-value text-success">$${parseFloat(totals.total_value || 0).toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Utilidad Potencial</div>
                    <div class="stat-value text-warning">$${parseFloat(totals.total_profit || 0).toFixed(2)}</div>
                </div>
            `;
            
            const tbody = document.getElementById('invReportTable');
            if (byCategory.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay datos</td></tr>';
                return;
            }
            
            tbody.innerHTML = byCategory.map(c => `
                <tr>
                    <td style="font-weight: 600;">${c.category || 'Sin categoría'}</td>
                    <td>${c.products}</td>
                    <td>${c.total_stock || 0}</td>
                    <td class="text-success">$${parseFloat(c.total_value || 0).toFixed(2)}</td>
                    <td class="text-warning">$${parseFloat(c.total_profit || 0).toFixed(2)}</td>
                </tr>
            `).join('');
        } catch (e) {
            app.showAlert('Error cargando inventario', 'error');
        }
    },

    loadProfitLoss: async function(dateFrom, dateTo) {
        try {
            const res = await fetch(`api/reports.php?action=profit_loss&date_from=${dateFrom}&date_to=${dateTo}`);
            const data = await res.json();
            
            const revenue = data.revenue || {};
            const costs = data.costs || {};
            
            document.getElementById('profitStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-title">Ingresos por Ventas</div>
                    <div class="stat-value text-success">$${parseFloat(revenue.sales || 0).toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Ingresos por Cibercafé</div>
                    <div class="stat-value text-primary">$${parseFloat(revenue.cyber || 0).toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Ingresos por Servicios</div>
                    <div class="stat-value text-primary">$${parseFloat(revenue.services || 0).toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Total Costos</div>
                    <div class="stat-value text-danger">$${parseFloat(costs.total || 0).toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Utilidad Bruta</div>
                    <div class="stat-value ${data.gross_profit >= 0 ? 'text-success' : 'text-danger'}">$${parseFloat(data.gross_profit || 0).toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Margen de Utilidad</div>
                    <div class="stat-value ${data.profit_margin >= 0 ? 'text-success' : 'text-danger'}">${parseFloat(data.profit_margin || 0).toFixed(1)}%</div>
                </div>
            `;
        } catch (e) {
            app.showAlert('Error cargando estado de resultados', 'error');
        }
    },

    exportCSV: function(type) {
        const dateFrom = document.getElementById('repDateFrom').value;
        const dateTo = document.getElementById('repDateTo').value;
        window.open(`api/reports.php?action=export&type=${type}&format=csv&date_from=${dateFrom}&date_to=${dateTo}`, '_blank');
    }
};

window.Reports = Reports;
