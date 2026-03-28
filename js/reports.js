// js/reports.js - Reports and Statistics Module
const Reports = {
    salesData: [],
    cyberData: [],
    productsData: [],
    inventoryData: [],
    currentReport: 'sales',

    init: function() {
        var today = new Date();
        var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        var lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        var lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        
        var dateFromEl = document.getElementById('repDateFrom');
        var dateToEl = document.getElementById('repDateTo');
        
        if (dateFromEl) dateFromEl.value = firstDay.toISOString().split('T')[0];
        if (dateToEl) dateToEl.value = today.toISOString().split('T')[0];
        
        this.loadReport();
    },

    setQuickRange: function() {
        var range = document.getElementById('repQuickRange').value;
        var today = new Date();
        var dateFromEl = document.getElementById('repDateFrom');
        var dateToEl = document.getElementById('repDateTo');
        
        if (!dateFromEl || !dateToEl) return;
        
        switch(range) {
            case 'today':
                dateFromEl.value = today.toISOString().split('T')[0];
                dateToEl.value = today.toISOString().split('T')[0];
                break;
            case 'week':
                var weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                dateFromEl.value = weekStart.toISOString().split('T')[0];
                dateToEl.value = today.toISOString().split('T')[0];
                break;
            case 'month':
                var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                dateFromEl.value = firstDay.toISOString().split('T')[0];
                dateToEl.value = today.toISOString().split('T')[0];
                break;
            case 'lastmonth':
                var lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                var lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                dateFromEl.value = lastMonth.toISOString().split('T')[0];
                dateToEl.value = lastMonthEnd.toISOString().split('T')[0];
                break;
            case 'year':
                var yearStart = new Date(today.getFullYear(), 0, 1);
                dateFromEl.value = yearStart.toISOString().split('T')[0];
                dateToEl.value = today.toISOString().split('T')[0];
                break;
        }
        
        this.loadReport();
    },

    getDateRange: function() {
        var dateFrom = '';
        var dateTo = '';
        var dateFromEl = document.getElementById('repDateFrom');
        var dateToEl = document.getElementById('repDateTo');
        if (dateFromEl) dateFrom = dateFromEl.value;
        if (dateToEl) dateTo = dateToEl.value;
        return { dateFrom: dateFrom, dateTo: dateTo };
    },

    switchTab: function(tabId) {
        this.currentReport = tabId;
        var container = document.getElementById('view-reports');
        if (!container) return;
        
        container.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        container.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
        
        var tab = container.querySelector('.tab[data-tab="' + tabId + '"]');
        if (tab) tab.classList.add('active');
        var content = document.getElementById('tab-' + tabId);
        if (content) content.classList.add('active');
        
        this.loadReport(tabId);
    },

    loadReport: function(tabId) {
        var activeTab = tabId || this.currentReport || 'sales';
        var range = this.getDateRange();
        
        switch(activeTab) {
            case 'sales': this.loadSalesReport(range.dateFrom, range.dateTo); break;
            case 'cyber': this.loadCyberReport(range.dateFrom, range.dateTo); break;
            case 'services': this.loadServicesReport(range.dateFrom, range.dateTo); break;
            case 'inventory': this.loadInventoryReport(); break;
            case 'providers': this.loadProvidersReport(range.dateFrom, range.dateTo); break;
            case 'summary': this.loadSummary(range.dateFrom, range.dateTo); break;
        }
    },

    loadSalesReport: function(dateFrom, dateTo) {
        var self = this;
        Promise.all([
            fetch('api/reports.php?action=sales_report&date_from=' + dateFrom + '&date_to=' + dateTo).then(function(r) { return r.json(); }),
            fetch('api/reports.php?action=top_products&date_from=' + dateFrom + '&date_to=' + dateTo + '&limit=10').then(function(r) { return r.json(); })
        ])
        .then(function(results) {
            var salesData = results[0];
            var topProducts = results[1];
            
            if (salesData.error) {
                app.showAlert('Error: ' + salesData.error, 'error');
                return;
            }
            
            self.salesData = salesData.data || [];
            self.productsData = topProducts.products || [];
            var totals = salesData.totals || {};
            
            var statsEl = document.getElementById('salesStats');
            if (statsEl) {
                var avg = totals.total > 0 ? (totals.total_amount / totals.total) : 0;
                statsEl.innerHTML = 
                    '<div class="stat-card"><div class="stat-title">Transacciones</div><div class="stat-value">' + (totals.total || 0) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Ingresos Totales</div><div class="stat-value text-success">$' + parseFloat(totals.total_amount || 0).toFixed(2) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Ticket Promedio</div><div class="stat-value">$' + avg.toFixed(2) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Efectivo</div><div class="stat-value text-warning">$' + parseFloat(salesData.data ? salesData.data.reduce(function(a, d) { return a + parseFloat(d.cash_total || 0); }, 0) : 0).toFixed(2) + '</div></div>';
            }
            
            var tbody = document.getElementById('salesReportTable');
            if (tbody) {
                if (self.salesData.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay ventas en este período</td></tr>';
                } else {
                    tbody.innerHTML = self.salesData.map(function(d) {
                        return '<tr>' +
                            '<td>' + self.escapeHtml(d.period) + '</td>' +
                            '<td>' + d.transactions + '</td>' +
                            '<td>$' + parseFloat(d.cash_total || 0).toFixed(2) + '</td>' +
                            '<td>$' + parseFloat(d.card_total || 0).toFixed(2) + '</td>' +
                            '<td>$' + parseFloat(d.transfer_total || 0).toFixed(2) + '</td>' +
                            '<td class="text-success"><strong>$' + parseFloat(d.total || 0).toFixed(2) + '</strong></td></tr>';
                    }).join('');
                }
            }
            
            var topTb = document.getElementById('topProductsTable');
            if (topTb) {
                if (self.productsData.length === 0) {
                    topTb.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay datos</td></tr>';
                } else {
                    topTb.innerHTML = self.productsData.map(function(p, i) {
                        var badge = i < 3 ? '<span class="badge badge-warning">Top ' + (i + 1) + '</span>' : '';
                        return '<tr>' +
                            '<td><strong>' + self.escapeHtml(p.name || 'N/A') + '</strong> ' + badge + '<br><small class="text-muted">' + (p.sku || '') + '</small></td>' +
                            '<td>' + (p.times_sold || 0) + '</td>' +
                            '<td>' + (p.total_qty_sold || 0) + '</td>' +
                            '<td class="text-success">$' + parseFloat(p.total_revenue || 0).toFixed(2) + '</td></tr>';
                    }).join('');
                }
            }
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
                var byStation = data.by_station || [];
                
                var statsEl = document.getElementById('cyberStats');
                if (statsEl) {
                    statsEl.innerHTML = 
                        '<div class="stat-card"><div class="stat-title">Sesiones</div><div class="stat-value">' + (totals.total_sessions || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Minutos Totales</div><div class="stat-value">' + Math.round(totals.total_minutes || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Ingresos</div><div class="stat-value text-success">$' + parseFloat(totals.total_revenue || 0).toFixed(2) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Ticket Promedio</div><div class="stat-value">$' + parseFloat(totals.total_revenue / totals.total_sessions || 0).toFixed(2) + '</div></div>';
                }
                
                var stationTb = document.getElementById('cyberByStationTable');
                if (stationTb) {
                    if (byStation.length === 0) {
                        stationTb.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay datos</td></tr>';
                    } else {
                        stationTb.innerHTML = byStation.map(function(s) {
                            return '<tr>' +
                                '<td>' + self.escapeHtml(s.station_name || 'N/A') + '</td>' +
                                '<td>' + (s.sessions || 0) + '</td>' +
                                '<td>' + Math.round(s.total_minutes || 0) + '</td>' +
                                '<td class="text-success">$' + parseFloat(s.total_revenue || 0).toFixed(2) + '</td></tr>';
                        }).join('');
                    }
                }
                
                var dailyTb = document.getElementById('cyberReportTable');
                if (dailyTb) {
                    if (daily.length === 0) {
                        dailyTb.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay datos</td></tr>';
                    } else {
                        dailyTb.innerHTML = daily.map(function(d) {
                            return '<tr>' +
                                '<td>' + self.escapeHtml(d.date) + '</td>' +
                                '<td>' + (d.sessions || 0) + '</td>' +
                                '<td>' + Math.round(d.total_minutes || 0) + '</td>' +
                                '<td>$' + parseFloat(d.avg_ticket || 0).toFixed(2) + '</td>' +
                                '<td class="text-success"><strong>$' + parseFloat(d.total_revenue || 0).toFixed(2) + '</strong></td></tr>';
                        }).join('');
                    }
                }
            })
            .catch(function(e) {
                console.error('Error cyber report:', e);
                app.showAlert('Error cargando reporte de cibercafé', 'error');
            });
    },

    loadServicesReport: function(dateFrom, dateTo) {
        var self = this;
        fetch('api/reports.php?action=services_report&date_from=' + dateFrom + '&date_to=' + dateTo)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    app.showAlert('Error: ' + data.error, 'error');
                    return;
                }
                
                var totals = data.totals || {};
                var byCategory = data.by_category || [];
                var byService = data.by_service || [];
                
                var statsEl = document.getElementById('servicesStats');
                if (statsEl) {
                    statsEl.innerHTML = 
                        '<div class="stat-card"><div class="stat-title">Transacciones</div><div class="stat-value">' + (totals.total_transactions || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Ingresos Totales</div><div class="stat-value text-success">$' + parseFloat(totals.total_revenue || 0).toFixed(2) + '</div></div>';
                }
                
                var catTb = document.getElementById('servicesByCategoryTable');
                if (catTb) {
                    if (byCategory.length === 0) {
                        catTb.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay datos</td></tr>';
                    } else {
                        catTb.innerHTML = byCategory.map(function(c) {
                            return '<tr>' +
                                '<td><strong>' + self.escapeHtml(c.category || 'Sin categoría') + '</strong></td>' +
                                '<td>' + (c.transactions || 0) + '</td>' +
                                '<td class="text-success">$' + parseFloat(c.total_revenue || 0).toFixed(2) + '</td></tr>';
                        }).join('');
                    }
                }
                
                var svcTb = document.getElementById('servicesByServiceTable');
                if (svcTb) {
                    if (byService.length === 0) {
                        svcTb.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay datos</td></tr>';
                    } else {
                        svcTb.innerHTML = byService.map(function(s) {
                            return '<tr>' +
                                '<td>' + self.escapeHtml(s.name || 'N/A') + '<br><small class="text-muted">' + (s.category || '') + '</small></td>' +
                                '<td>' + (s.times_used || 0) + '</td>' +
                                '<td class="text-success">$' + parseFloat(s.total_revenue || 0).toFixed(2) + '</td></tr>';
                        }).join('');
                    }
                }
            })
            .catch(function(e) {
                console.error('Error services report:', e);
                app.showAlert('Error cargando reporte de servicios', 'error');
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
                var byStatus = data.by_status || [];
                var lowStock = data.low_stock || [];
                
                var statsEl = document.getElementById('invStats');
                if (statsEl) {
                    statsEl.innerHTML = 
                        '<div class="stat-card"><div class="stat-title">Productos</div><div class="stat-value">' + (totals.total_products || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Unidades</div><div class="stat-value">' + (totals.total_units || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Valor Inventario</div><div class="stat-value text-success">$' + parseFloat(totals.total_value || 0).toFixed(2) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Utilidad Potencial</div><div class="stat-value text-warning">$' + parseFloat(totals.total_profit || 0).toFixed(2) + '</div></div>';
                }
                
                var catTb = document.getElementById('invReportTable');
                if (catTb) {
                    if (byCategory.length === 0) {
                        catTb.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay datos</td></tr>';
                    } else {
                        catTb.innerHTML = byCategory.map(function(c) {
                            return '<tr>' +
                                '<td><strong>' + self.escapeHtml(c.category || 'Sin categoría') + '</strong></td>' +
                                '<td>' + (c.products || 0) + '</td>' +
                                '<td>' + (c.total_stock || 0) + '</td>' +
                                '<td class="text-success">$' + parseFloat(c.total_value || 0).toFixed(2) + '</td>' +
                                '<td class="text-warning">$' + parseFloat(c.total_profit || 0).toFixed(2) + '</td></tr>';
                        }).join('');
                    }
                }
                
                var statusTb = document.getElementById('invByStatusTable');
                if (statusTb) {
                    if (byStatus.length === 0) {
                        statusTb.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No hay datos</td></tr>';
                    } else {
                        statusTb.innerHTML = byStatus.map(function(s) {
                            var cls = s.status === 'Agotado' ? 'badge-danger' : (s.status === 'Stock Bajo' ? 'badge-warning' : 'badge-success');
                            return '<tr><td><span class="badge ' + cls + '">' + self.escapeHtml(s.status) + '</span></td><td>' + (s.count || 0) + '</td></tr>';
                        }).join('');
                    }
                }
                
                var lowTb = document.getElementById('invLowStockTable');
                if (lowTb) {
                    if (lowStock.length === 0) {
                        lowTb.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay productos con stock bajo</td></tr>';
                    } else {
                        lowTb.innerHTML = lowStock.slice(0, 20).map(function(p) {
                            return '<tr>' +
                                '<td><code>' + self.escapeHtml(p.sku || p.id) + '</code></td>' +
                                '<td>' + self.escapeHtml(p.name || 'N/A') + '</td>' +
                                '<td><span class="badge badge-danger">' + (p.stock || 0) + '</span></td>' +
                                '<td>' + (p.min_stock || 0) + '</td>' +
                                '<td>' + self.escapeHtml(p.category_name || '-') + '</td></tr>';
                        }).join('');
                    }
                }
            })
            .catch(function(e) {
                console.error('Error inventory report:', e);
                app.showAlert('Error cargando reporte de inventario', 'error');
            });
    },

    loadProvidersReport: function(dateFrom, dateTo) {
        var self = this;
        fetch('api/reports.php?action=suppliers_report')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    app.showAlert('Error: ' + data.error, 'error');
                    return;
                }
                
                var suppliers = data.suppliers || [];
                var totals = data.totals || {};
                
                var statsEl = document.getElementById('providerStats');
                if (statsEl) {
                    statsEl.innerHTML = 
                        '<div class="stat-card"><div class="stat-title">Proveedores</div><div class="stat-value">' + suppliers.length + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Pedidos Totales</div><div class="stat-value">' + (totals.total_orders || 0) + '</div></div>' +
                        '<div class="stat-card"><div class="stat-title">Total Compras</div><div class="stat-value text-danger">$' + parseFloat(totals.total_amount || 0).toFixed(2) + '</div></div>';
                }
                
                var supTb = document.getElementById('providersReportTable');
                if (supTb) {
                    if (suppliers.length === 0) {
                        supTb.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay datos</td></tr>';
                    } else {
                        supTb.innerHTML = suppliers.map(function(s) {
                            return '<tr>' +
                                '<td><strong>' + self.escapeHtml(s.name || 'N/A') + '</strong><br><small class="text-muted">' + self.escapeHtml(s.company_name || '') + '</small></td>' +
                                '<td>' + (s.total_orders || 0) + '</td>' +
                                '<td>' + (s.completed_orders || 0) + '</td>' +
                                '<td class="text-danger">$' + parseFloat(s.total_purchases || 0).toFixed(2) + '</td></tr>';
                        }).join('');
                    }
                }
            })
            .catch(function(e) {
                console.error('Error providers report:', e);
                app.showAlert('Error cargando reporte de proveedores', 'error');
            });
    },

    loadSummary: function(dateFrom, dateTo) {
        var self = this;
        Promise.all([
            fetch('api/reports.php?action=sales_report&date_from=' + dateFrom + '&date_to=' + dateTo).then(function(r) { return r.json(); }),
            fetch('api/reports.php?action=cyber_report&date_from=' + dateFrom + '&date_to=' + dateTo).then(function(r) { return r.json(); }),
            fetch('api/reports.php?action=services_report&date_from=' + dateFrom + '&date_to=' + dateTo).then(function(r) { return r.json(); }),
            fetch('api/reports.php?action=profit_loss&date_from=' + dateFrom + '&date_to=' + dateTo).then(function(r) { return r.json(); })
        ])
        .then(function(results) {
            var sales = results[0];
            var cyber = results[1];
            var services = results[2];
            var profit = results[3];
            
            var totalSales = sales.totals ? parseFloat(sales.totals.total_amount || 0) : 0;
            var totalCyber = cyber.totals ? parseFloat(cyber.totals.total_revenue || 0) : 0;
            var totalServices = services.totals ? parseFloat(services.totals.total_revenue || 0) : 0;
            var totalIncome = totalSales + totalCyber + totalServices;
            
            var summaryEl = document.getElementById('summaryStats');
            if (summaryEl) {
                summaryEl.innerHTML = 
                    '<div class="stat-card"><div class="stat-title">Ingresos Totales</div><div class="stat-value text-success">$' + totalIncome.toFixed(2) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Ventas</div><div class="stat-value">$' + totalSales.toFixed(2) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Cibercafé</div><div class="stat-value">$' + totalCyber.toFixed(2) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-title">Servicios</div><div class="stat-value">$' + totalServices.toFixed(2) + '</div></div>';
            }
            
            var incomeTb = document.getElementById('incomeBreakdownTable');
            if (incomeTb) {
                var rows = [
                    { source: 'Ventas', amount: totalSales },
                    { source: 'Cibercafé', amount: totalCyber },
                    { source: 'Servicios', amount: totalServices }
                ];
                incomeTb.innerHTML = rows.map(function(r) {
                    var pct = totalIncome > 0 ? ((r.amount / totalIncome) * 100).toFixed(1) : '0';
                    return '<tr><td>' + r.source + '</td><td>$' + r.amount.toFixed(2) + '</td><td>' + pct + '%</td></tr>';
                }).join('');
            }
            
            var profitEl = document.getElementById('profitLossDisplay');
            if (profitEl && profit.gross_profit !== undefined) {
                var profitClass = profit.gross_profit >= 0 ? 'text-success' : 'text-danger';
                profitEl.innerHTML = 
                    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;text-align:center;">' +
                    '<div><h4>Ingresos</h4><p style="font-size:2rem;color:#10b981;">$' + parseFloat(profit.revenue ? profit.revenue.total : 0).toFixed(2) + '</p></div>' +
                    '<div><h4>Utilidad Bruta</h4><p style="font-size:2rem;' + profitClass + ';">$' + parseFloat(profit.gross_profit || 0).toFixed(2) + '</p></div></div>' +
                    '<p style="text-align:center;margin-top:1rem;">Margen de Utilidad: <strong class="' + profitClass + '">' + parseFloat(profit.profit_margin || 0).toFixed(1) + '%</strong></p>';
            }
        })
        .catch(function(e) {
            console.error('Error summary:', e);
            app.showAlert('Error cargando resumen', 'error');
        });
    },

    escapeHtml: function(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    exportCurrentReport: function() {
        window.open('api/reports.php?action=export&type=' + this.currentReport + '&format=csv&date_from=' + this.getDateRange().dateFrom + '&date_to=' + this.getDateRange().dateTo, '_blank');
    }
};
