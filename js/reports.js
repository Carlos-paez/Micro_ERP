// js/reports.js - Reports and Statistics Module
const Reports = {
    salesData: [],
    cyberData: [],
    productsData: [],
    inventoryData: [],

    init: function() {
        var today = new Date();
        var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        var dateFromEl = document.getElementById('repDateFrom');
        var dateToEl = document.getElementById('repDateTo');
        
        if (dateFromEl) dateFromEl.value = firstDay.toISOString().split('T')[0];
        if (dateToEl) dateToEl.value = today.toISOString().split('T')[0];
        
        this.loadReport();
    },

    switchTab: function(tabId) {
        var self = this;
        document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
        var tab = document.querySelector('.tab[data-tab="' + tabId + '"]');
        if (tab) tab.classList.add('active');
        var content = document.getElementById('tab-' + tabId);
        if (content) content.classList.add('active');
        
        this.loadReport(tabId);
    },

    loadReport: function(tabId) {
        var activeTab = tabId || 'sales';
        var dateFrom = '';
        var dateTo = '';
        
        var dateFromEl = document.getElementById('repDateFrom');
        var dateToEl = document.getElementById('repDateTo');
        if (dateFromEl) dateFrom = dateFromEl.value;
        if (dateToEl) dateTo = dateToEl.value;
        
        switch(activeTab) {
            case 'sales': this.loadSalesReport(dateFrom, dateTo); break;
            case 'cyber': this.loadCyberReport(dateFrom, dateTo); break;
            case 'inventory': this.loadInventoryReport(); break;
        }
    },

    loadSalesReport: function(dateFrom, dateTo) {
        var self = this;
        fetch('api/reports.php?action=sales_report&date_from=' + dateFrom + '&date_to=' + dateTo)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    app.showAlert('Error: ' + data.error, 'error');
                    return;
                }
                
                self.salesData = data.data || [];
                var totals = data.totals || {};
                
                var statsEl = document.getElementById('salesStats');
                if (statsEl) {
                    statsEl.innerHTML = 
                        '<div class="stat-card"><div class="stat-title">Total Transacciones</div><div class="stat-value">' + (totals.total || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Ingresos Totales</div><div class="stat-value text-success">$' + parseFloat(totals.total_amount || 0).toFixed(2) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Ticket Promedio</div><div class="stat-value">$' + (totals.total > 0 ? (totals.total_amount / totals.total).toFixed(2) : '0.00') + '</div></div>';
                }
                
                var tbody = document.getElementById('salesReportTable');
                if (!tbody) return;
                
                if (self.salesData.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay datos en este período</td></tr>';
                    return;
                }
                
                tbody.innerHTML = self.salesData.map(function(d) {
                    return '<tr>' +
                        '<td>' + d.period + '</td>' +
                        '<td>' + d.transactions + '</td>' +
                        '<td class="text-success">$' + parseFloat(d.cash_total || 0).toFixed(2) + '</td>' +
                        '<td class="text-primary">$' + parseFloat(d.card_total || 0).toFixed(2) + '</td>' +
                        '<td class="text-warning">$' + parseFloat(d.transfer_total || 0).toFixed(2) + '</td>' +
                        '<td class="text-success"><strong>$' + parseFloat(d.total || 0).toFixed(2) + '</strong></td></tr>';
                }).join('');
            })
            .catch(function(e) {
                console.error('Error sales report:', e);
                app.showAlert('Error cargando reporte de ventas', 'error');
            });
    },

    loadCyberReport: function(dateFrom, dateTo) {
        var self = this;
        fetch('api/reports.php?action=cyber_report&date_from=' + dateFrom + '&date_to=' + dateTo)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    app.showAlert('Error: ' + data.error, 'error');
                    return;
                }
                
                var totals = data.totals || {};
                var daily = data.daily || [];
                
                var statsEl = document.getElementById('cyberStats');
                if (statsEl) {
                    statsEl.innerHTML = 
                        '<div class="stat-card"><div class="stat-title">Total Sesiones</div><div class="stat-value">' + (totals.total_sessions || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Minutos Totales</div><div class="stat-value">' + Math.round(totals.total_minutes || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Ingresos Totales</div><div class="stat-value text-success">$' + parseFloat(totals.total_revenue || 0).toFixed(2) + '</div></div>';
                }
                
                var tbody = document.getElementById('cyberReportTable');
                if (!tbody) return;
                
                if (daily.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay datos</td></tr>';
                    return;
                }
                
                tbody.innerHTML = daily.map(function(d) {
                    return '<tr>' +
                        '<td>' + d.date + '</td>' +
                        '<td>' + d.sessions + '</td>' +
                        '<td>' + Math.round(d.total_minutes) + '</td>' +
                        '<td class="text-success"><strong>$' + parseFloat(d.total_revenue || 0).toFixed(2) + '</strong></td>' +
                        '<td>$' + parseFloat(d.avg_ticket || 0).toFixed(2) + '</td></tr>';
                }).join('');
            })
            .catch(function(e) {
                console.error('Error cyber report:', e);
                app.showAlert('Error cargando reporte de cibercafé', 'error');
            });
    },

    loadTopProducts: function(dateFrom, dateTo) {
        var self = this;
        fetch('api/reports.php?action=top_products&date_from=' + dateFrom + '&date_to=' + dateTo + '&limit=20')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    app.showAlert('Error: ' + data.error, 'error');
                    return;
                }
                
                self.productsData = data.products || [];
                
                var tbody = document.getElementById('topProductsTable');
                if (!tbody) return;
                
                if (self.productsData.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay datos</td></tr>';
                    return;
                }
                
                tbody.innerHTML = self.productsData.map(function(p, i) {
                    var badge = i < 3 ? '<span class="badge badge-warning">Top ' + (i + 1) + '</span>' : '';
                    return '<tr>' +
                        '<td><div style="font-weight:600;">' + p.name + '</div>' + badge + '</td>' +
                        '<td>' + (p.sku || '-') + '</td>' +
                        '<td>' + p.times_sold + '</td>' +
                        '<td>' + p.total_qty_sold + '</td>' +
                        '<td class="text-success"><strong>$' + parseFloat(p.total_revenue || 0).toFixed(2) + '</strong></td></tr>';
                }).join('');
            })
            .catch(function(e) {
                console.error('Error top products:', e);
                app.showAlert('Error cargando productos', 'error');
            });
    },

    loadInventoryReport: function() {
        var self = this;
        fetch('api/reports.php?action=inventory_report')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    app.showAlert('Error: ' + data.error, 'error');
                    return;
                }
                
                var byCategory = data.by_category || [];
                var totals = data.totals || {};
                
                var statsEl = document.getElementById('invStats');
                if (statsEl) {
                    statsEl.innerHTML = 
                        '<div class="stat-card"><div class="stat-title">Total Productos</div><div class="stat-value">' + (totals.total_products || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Unidades en Stock</div><div class="stat-value">' + (totals.total_units || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Valor del Inventario</div><div class="stat-value text-success">$' + parseFloat(totals.total_value || 0).toFixed(2) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Utilidad Potencial</div><div class="stat-value text-warning">$' + parseFloat(totals.total_profit || 0).toFixed(2) + '</div></div>';
                }
                
                var tbody = document.getElementById('invReportTable');
                if (!tbody) return;
                
                if (byCategory.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay datos</td></tr>';
                    return;
                }
                
                tbody.innerHTML = byCategory.map(function(c) {
                    return '<tr>' +
                        '<td style="font-weight:600;">' + (c.category || 'Sin categoría') + '</td>' +
                        '<td>' + c.products + '</td>' +
                        '<td>' + (c.total_stock || 0) + '</td>' +
                        '<td class="text-success">$' + parseFloat(c.total_value || 0).toFixed(2) + '</td>' +
                        '<td class="text-warning">$' + parseFloat(c.total_profit || 0).toFixed(2) + '</td></tr>';
                }).join('');
            })
            .catch(function(e) {
                console.error('Error inventory report:', e);
                app.showAlert('Error cargando inventario', 'error');
            });
    },

    loadProfitLoss: function(dateFrom, dateTo) {
        var self = this;
        fetch('api/reports.php?action=profit_loss&date_from=' + dateFrom + '&date_to=' + dateTo)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    app.showAlert('Error: ' + data.error, 'error');
                    return;
                }
                
                var revenue = data.revenue || {};
                var costs = data.costs || {};
                var profitClass = data.gross_profit >= 0 ? 'text-success' : 'text-danger';
                var marginClass = data.profit_margin >= 0 ? 'text-success' : 'text-danger';
                
                var statsEl = document.getElementById('profitStats');
                if (statsEl) {
                    statsEl.innerHTML = 
                        '<div class="stat-card"><div class="stat-title">Ingresos por Ventas</div><div class="stat-value text-success">$' + parseFloat(revenue.sales || 0).toFixed(2) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Ingresos por Cibercafé</div><div class="stat-value text-primary">$' + parseFloat(revenue.cyber || 0).toFixed(2) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Ingresos por Servicios</div><div class="stat-value text-primary">$' + parseFloat(revenue.services || 0).toFixed(2) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Total Costos</div><div class="stat-value text-danger">$' + parseFloat(costs.total || 0).toFixed(2) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Utilidad Bruta</div><div class="stat-value ' + profitClass + '">$' + parseFloat(data.gross_profit || 0).toFixed(2) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Margen de Utilidad</div><div class="stat-value ' + marginClass + '">' + parseFloat(data.profit_margin || 0).toFixed(1) + '%</div></div>';
                }
            })
            .catch(function(e) {
                console.error('Error profit loss:', e);
                app.showAlert('Error cargando estado de resultados', 'error');
            });
    },

    exportCSV: function(type) {
        var dateFrom = '';
        var dateTo = '';
        var dateFromEl = document.getElementById('repDateFrom');
        var dateToEl = document.getElementById('repDateTo');
        if (dateFromEl) dateFrom = dateFromEl.value;
        if (dateToEl) dateTo = dateToEl.value;
        
        window.open('api/reports.php?action=export&type=' + type + '&format=csv&date_from=' + dateFrom + '&date_to=' + dateTo, '_blank');
    }
};
