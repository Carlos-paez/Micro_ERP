// js/cyber.js - Cibercontrol Module
const Cyber = {
    stations: [],
    sessions: [],
    services: [],
    history: [],
    currentTab: 'stations',

    init: function() {
        this.loadStations();
        this.loadActiveSessions();
        this.loadServices();
        this.loadQuickStats();
    },

    loadQuickStats: function() {
        var self = this;
        fetch('api/cyber.php?action=list_stations')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) return;
                self.stations = data.stations || [];
                var available = self.stations.filter(function(s) { return s.status === 'available'; }).length;
                var statAvail = document.getElementById('statAvailableStations');
                if (statAvail) statAvail.textContent = available + '/' + self.stations.length;
            });
        
        fetch('api/cyber.php?action=active_sessions')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) return;
                var count = (data.sessions || []).length;
                var statActive = document.getElementById('statActiveSessions');
                if (statActive) statActive.textContent = count;
            });
    },

    switchTab: function(tabId) {
        this.currentTab = tabId;
        var container = document.getElementById('view-cyber');
        if (!container) return;
        
        container.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        container.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
        
        var tab = container.querySelector('.tab[data-tab="' + tabId + '"]');
        if (tab) tab.classList.add('active');
        var content = document.getElementById('tab-' + tabId);
        if (content) content.classList.add('active');
        
        if (tabId === 'stations') this.renderStations();
        if (tabId === 'sessions') this.loadActiveSessions();
        if (tabId === 'services') this.renderServices();
        if (tabId === 'history') this.initHistoryTab();
    },

    filterServices: function() {
        this.renderServices();
    },

    loadStations: function() {
        var self = this;
        fetch('api/cyber.php?action=list_stations')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    console.error('Error stations:', data.error);
                    app.showAlert('Error cargando estaciones', 'error');
                    return;
                }
                self.stations = data.stations || [];
                self.renderStations();
                self.updateStationStats();
            })
            .catch(function(e) {
                console.error('Error loading stations:', e);
                app.showAlert('Error de conexión', 'error');
            });
    },

    updateStationStats: function() {
        var available = this.stations.filter(function(s) { return s.status === 'available'; }).length;
        var statAvail = document.getElementById('statAvailableStations');
        if (statAvail) statAvail.textContent = available + '/' + this.stations.length;
    },

    renderStations: function() {
        var grid = document.getElementById('stationsGrid');
        if (!grid) return;

        if (this.stations.length === 0) {
            grid.innerHTML = '<div class="empty-state"><span class="empty-state-icon">🖥️</span><div class="empty-state-title">Sin estaciones</div><div class="empty-state-text">Configura las estaciones de trabajo para comenzar</div><button class="btn btn-primary" onclick="Cyber.showStationModal()">+ Agregar Estación</button></div>';
            return;
        }

        var self = this;
        grid.innerHTML = this.stations.map(function(s) {
            var statusClass = s.status === 'available' ? 'status-available' : 
                             s.status === 'occupied' ? 'status-occupied' : 
                             s.status === 'maintenance' ? 'status-maintenance' : 'status-offline';
            var statusText = s.status === 'available' ? 'Disponible' : 
                            s.status === 'occupied' ? 'Ocupado' : 
                            s.status === 'maintenance' ? 'Mantenimiento' : 'Fuera de línea';
            
            var actions = '';
            if (s.status === 'available') {
                actions = '<button class="btn btn-primary btn-sm" onclick="Cyber.startSession(' + s.id + ')">🎮 Iniciar Sesión</button>';
            } else if (s.status === 'occupied') {
                actions = '<button class="btn btn-success btn-sm" onclick="Cyber.endSessionByStation(' + s.id + ')">⏹️ Finalizar</button>';
            } else {
                actions = '<button class="btn btn-secondary btn-sm" onclick="Cyber.toggleStatus(' + s.id + ')">🔄 Cambiar</button>';
            }
            actions += ' <button class="btn btn-warning btn-sm" onclick="Cyber.showStationModal(' + s.id + ')" title="Configurar">⚙️</button>';
            
            return '<div class="station-card ' + statusClass + '">' +
                '<div class="station-header">' +
                '<h4>' + self.escapeHtml(s.name) + '</h4>' +
                '<span class="status-badge ' + statusClass + '">' + statusText + '</span>' +
                '</div>' +
                '<div class="station-info">' +
                '<p>📍 ' + self.escapeHtml(s.location || 'Sin ubicación') + '</p>' +
                '<p>💰 $' + parseFloat(s.hourly_rate || 0).toFixed(2) + '/hora</p>' +
                (s.ip_address ? '<p>🌐 ' + self.escapeHtml(s.ip_address) + '</p>' : '') +
                (s.hostname ? '<p>🖥️ ' + self.escapeHtml(s.hostname) + '</p>' : '') +
                '</div>' +
                '<div class="station-actions">' + actions + '</div>' +
                '</div>';
        }).join('');
    },

    escapeHtml: function(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    loadActiveSessions: function() {
        var self = this;
        fetch('api/cyber.php?action=active_sessions')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    console.error('Error sessions:', data.error);
                    app.showAlert('Error cargando sesiones', 'error');
                    return;
                }
                self.sessions = data.sessions || [];
                self.renderActiveSessions();
                self.updateSessionStats();
            })
            .catch(function(e) {
                console.error('Error loading sessions:', e);
                app.showAlert('Error de conexión', 'error');
            });
    },

    updateSessionStats: function() {
        var count = this.sessions.length;
        var statActive = document.getElementById('statActiveSessions');
        if (statActive) statActive.textContent = count;
    },

    renderActiveSessions: function() {
        var tbody = document.getElementById('activeSessionsTable2');
        if (!tbody) return;
        
        var self = this;
        if (this.sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><span class="empty-state-icon">⏱️</span><div class="empty-state-title">Sin sesiones activas</div><div class="empty-state-text">Las sesiones de internet aparecerán aquí</div></div></td></tr>';
        } else {
            tbody.innerHTML = this.sessions.map(function(s) {
                var action = s.status === 'paused' ? 
                    '<button class="btn btn-success btn-sm" onclick="Cyber.resumeSession(' + s.id + ')">▶️ Reanudar</button>' :
                    '<button class="btn btn-danger btn-sm" onclick="Cyber.endSession(' + s.id + ')">⏹️ Finalizar</button>';
                var startTime = new Date(s.start_time);
                return '<tr>' +
                    '<td><strong>' + self.escapeHtml(s.station_name || 'N/A') + '</strong></td>' +
                    '<td>' + self.escapeHtml(s.customer_name || 'Cliente') + '</td>' +
                    '<td>' + startTime.toLocaleTimeString() + '</td>' +
                    '<td><span class="badge badge-warning">' + (s.elapsed_formatted || '0:00') + '</span></td>' +
                    '<td class="text-success">$' + parseFloat(s.total_cost || 0).toFixed(2) + '</td>' +
                    '<td>' + action + '</td></tr>';
            }).join('');
        }
    },

    loadServices: function() {
        var self = this;
        fetch('api/cyber.php?action=list_services')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    console.error('Error services:', data.error);
                    app.showAlert('Error cargando servicios', 'error');
                    return;
                }
                self.services = data.services || [];
                self.renderServices();
            })
            .catch(function(e) {
                console.error('Error loading services:', e);
                app.showAlert('Error de conexión', 'error');
            });
    },

    renderServices: function() {
        var grid = document.getElementById('servicesGrid');
        if (!grid) return;

        var categoryFilter = document.getElementById('serviceCategoryFilter');
        var selectedCategory = categoryFilter ? categoryFilter.value : '';
        
        var filtered = this.services;
        if (selectedCategory) {
            filtered = this.services.filter(function(s) { return s.category === selectedCategory; });
        }

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="empty-state"><span class="empty-state-icon">🖨️</span><div class="empty-state-title">Sin servicios</div><div class="empty-state-text">Los servicios de impresión y otros aparecerán aquí' + (selectedCategory ? ' en esta categoría' : '') + '</div></div>';
            return;
        }

        var self = this;
        grid.innerHTML = filtered.map(function(s) {
            var categoryBadge = s.category ? '<span class="badge badge-secondary" style="font-size:0.65rem;">' + s.category + '</span>' : '';
            var duration = s.duration_minutes ? '<div class="service-duration">⏱️ ~' + s.duration_minutes + ' min</div>' : '';
            return '<div class="service-card">' +
                '<h4>' + self.escapeHtml(s.name) + ' ' + categoryBadge + '</h4>' +
                '<p>' + self.escapeHtml(s.description || '') + '</p>' +
                duration +
                '<div class="service-price">$' + parseFloat(s.price || 0).toFixed(2) + '</div>' +
                '<button class="btn btn-primary btn-sm" onclick="Cyber.showServiceModal(' + s.id + ')">Registrar</button>' +
                '</div>';
        }).join('');
    },

    showServiceModal: function(serviceId) {
        var service = this.services.find(function(s) { return s.id === serviceId; });
        if (!service) return;
        
        var self = this;
        var html = '<form onsubmit="event.preventDefault(); Cyber.quickRecordService(' + serviceId + ')">' +
            '<h3>' + this.escapeHtml(service.name) + '</h3>' +
            '<p class="text-muted">' + this.escapeHtml(service.description || '') + '</p>' +
            '<hr style="border-color:#334155;">' +
            '<div class="form-group"><label class="form-label">Nombre del Cliente</label>' +
            '<input type="text" id="svcCustomer" class="form-control" placeholder="Cliente"></div>' +
            '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">Cantidad</label>' +
            '<input type="number" id="svcQty" class="form-control" value="1" min="1"></div>' +
            '<div class="form-group" style="flex:1;"><label class="form-label">Precio</label>' +
            '<input type="number" id="svcPrice" class="form-control" step="0.01" value="' + service.price + '"></div></div>' +
            '<div class="form-group"><label class="form-label">Método de Pago</label>' +
            '<select id="svcPayment" class="form-control">' +
            '<option value="cash">💵 Efectivo</option>' +
            '<option value="card">💳 Tarjeta</option>' +
            '<option value="transfer">🏦 Transferencia</option></select></div>' +
            '<div style="background:#1e293b;padding:1rem;border-radius:0.5rem;margin:1rem 0;text-align:center;">' +
            '<div style="font-size:1.5rem;"><strong>Total: </strong><span id="svcTotal" style="color:#10b981;font-weight:bold;">$' + parseFloat(service.price || 0).toFixed(2) + '</span></div></div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-success">💰 Cobrar</button></div></form>';
        
        app.showModal('Registrar Servicio', html);
        
        document.getElementById('svcQty').addEventListener('input', function() {
            var qty = parseInt(this.value) || 1;
            var price = parseFloat(document.getElementById('svcPrice').value) || 0;
            document.getElementById('svcTotal').textContent = '$' + (qty * price).toFixed(2);
        });
    },

    quickRecordService: function(serviceId) {
        var self = this;
        var customer = document.getElementById('svcCustomer').value;
        var qty = parseInt(document.getElementById('svcQty').value) || 1;
        var price = parseFloat(document.getElementById('svcPrice').value) || 0;
        var payment = document.getElementById('svcPayment').value;
        
        fetch('api/cyber.php?action=record_service', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: serviceId,
                customer_name: customer,
                quantity: qty,
                unit_price: price,
                payment_method: payment
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            if (result.success) {
                app.showAlert('Servicio registrado - Total: $' + parseFloat(result.total).toFixed(2));
                app.closeModal();
            } else {
                throw new Error(result.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    recordService: function(serviceId, name, price) {
        this.showServiceModal(serviceId);
    },

    initHistoryTab: function() {
        var today = new Date();
        var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        var dateFrom = document.getElementById('histDateFrom');
        var dateTo = document.getElementById('histDateTo');
        if (dateFrom) dateFrom.value = firstDay.toISOString().split('T')[0];
        if (dateTo) dateTo.value = today.toISOString().split('T')[0];
        
        this.loadHistory();
    },

    loadHistory: function() {
        var self = this;
        var dateFrom = document.getElementById('histDateFrom') ? document.getElementById('histDateFrom').value : '';
        var dateTo = document.getElementById('histDateTo') ? document.getElementById('histDateTo').value : '';
        
        fetch('api/cyber.php?action=session_history&date_from=' + dateFrom + '&date_to=' + dateTo)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    app.showAlert('Error cargando historial', 'error');
                    return;
                }
                self.history = data.sessions || [];
                self.renderHistory();
            })
            .catch(function(e) {
                app.showAlert('Error cargando historial', 'error');
            });
    },

    renderHistory: function() {
        var tbody = document.getElementById('historyTable');
        if (!tbody) return;

        if (this.history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><span class="empty-state-icon">📋</span><div class="empty-state-title">Sin historial</div><div class="empty-state-text">El historial de sesiones aparecerá aquí</div></div></td></tr>';
            return;
        }

        var self = this;
        tbody.innerHTML = this.history.map(function(s) {
            var duration = Math.round(s.time_used_seconds / 60);
            var startTime = new Date(s.start_time);
            var endTime = s.end_time ? new Date(s.end_time) : null;
            var statusClass = s.status === 'completed' ? 'badge-success' : (s.status === 'cancelled' ? 'badge-danger' : 'badge-warning');
            
            return '<tr>' +
                '<td>' + startTime.toLocaleDateString() + '</td>' +
                '<td>' + startTime.toLocaleTimeString() + '</td>' +
                '<td>' + (endTime ? endTime.toLocaleTimeString() : '-') + '</td>' +
                '<td><span class="badge badge-secondary">' + duration + ' min</span></td>' +
                '<td class="text-success">$' + parseFloat(s.total_cost || 0).toFixed(2) + '</td>' +
                '<td>' + self.escapeHtml(s.station_name || 'N/A') + '</td>' +
                '<td>' + self.escapeHtml(s.customer_name || '-') + '</td></tr>';
        }).join('');
    },

    showStationModal: function(stationId) {
        var station = stationId ? this.stations.find(function(s) { return s.id === stationId; }) : null;
        var isEdit = station !== null;
        
        var html = '<form onsubmit="event.preventDefault(); Cyber.saveStation(' + (stationId || 'null') + ')">' +
            '<div class="form-group"><label class="form-label">Nombre de la Estación *</label>' +
            '<input type="text" id="stName" class="form-control" value="' + (station ? this.escapeHtml(station.name) : '') + '" required placeholder="Ej: PC-01"></div>' +
            '<div class="form-group"><label class="form-label">Hostname</label>' +
            '<input type="text" id="stHostname" class="form-control" value="' + (station ? this.escapeHtml(station.hostname || '') : '') + '" placeholder="Nombre de red"></div>' +
            '<div class="form-group"><label class="form-label">Dirección IP</label>' +
            '<input type="text" id="stIp" class="form-control" value="' + (station ? this.escapeHtml(station.ip_address || '') : '') + '" placeholder="192.168.1.100"></div>' +
            '<div class="form-group"><label class="form-label">MAC Address</label>' +
            '<input type="text" id="stMac" class="form-control" value="' + (station ? this.escapeHtml(station.mac_address || '') : '') + '" placeholder="AA:BB:CC:DD:EE:FF"></div>' +
            '<div class="form-group"><label class="form-label">Ubicación en el Local</label>' +
            '<input type="text" id="stLocation" class="form-control" value="' + (station ? this.escapeHtml(station.location || '') : '') + '" placeholder="Ej: Zona A - Frente"></div>' +
            '<div class="form-group"><label class="form-label">Especificaciones</label>' +
            '<textarea id="stSpecs" class="form-control" placeholder="Procesador, RAM, GPU, etc.">' + (station ? this.escapeHtml(station.specifications || '') : '') + '</textarea></div>' +
            '<div class="form-group"><label class="form-label">Tarifa por Hora ($)</label>' +
            '<input type="number" id="stRate" class="form-control" step="0.01" value="' + (station ? station.hourly_rate : '15.00') + '" required></div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Actualizar' : 'Crear') + '</button></div></form>';
        app.showModal(isEdit ? 'Editar Estación' : 'Nueva Estación', html);
    },

    saveStation: function(id) {
        var self = this;
        var data = {
            name: document.getElementById('stName').value,
            hostname: document.getElementById('stHostname').value,
            ip_address: document.getElementById('stIp').value,
            mac_address: document.getElementById('stMac').value,
            location: document.getElementById('stLocation').value,
            specifications: document.getElementById('stSpecs').value,
            hourly_rate: parseFloat(document.getElementById('stRate').value) || 15
        };

        var action = id ? 'update_station' : 'create_station';
        if (id) data.id = id;

        fetch('api/cyber.php?action=' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            if (result.success) {
                app.showAlert(result.message);
                app.closeModal();
                self.loadStations();
            } else {
                throw new Error(result.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    showSessionModal: function() {
        var self = this;
        var availableStations = this.stations.filter(function(s) { return s.status === 'available'; });
        
        if (availableStations.length === 0) {
            app.showAlert('No hay estaciones disponibles', 'error');
            return;
        }
        
        var options = availableStations.map(function(s) {
            return '<option value="' + s.id + '" data-rate="' + s.hourly_rate + '">' + self.escapeHtml(s.name) + ' - $' + parseFloat(s.hourly_rate || 0).toFixed(2) + '/hr</option>';
        }).join('');

        var html = '<form onsubmit="event.preventDefault(); Cyber.createSession()">' +
            '<div class="form-group"><label class="form-label">Estación *</label>' +
            '<select id="ssStation" class="form-control" required onchange="Cyber.updateSessionRate()">' +
            '<option value="">-- Seleccionar --</option>' + options + '</select></div>' +
            '<div class="form-group"><label class="form-label">Nombre del Cliente</label>' +
            '<input type="text" id="ssCustomer" class="form-control" placeholder="Nombre del cliente"></div>' +
            '<div class="form-group"><label class="form-label">Tipo de Sesión</label>' +
            '<select id="ssType" class="form-control" onchange="Cyber.toggleTimeInput()">' +
            '<option value="time">⏱️ Por Tiempo</option>' +
            '<option value="amount">💰 Monto Fijo</option></select></div>' +
            '<div class="form-group" id="timeGroup">' +
            '<label class="form-label">Tiempo (minutos)</label>' +
            '<input type="number" id="ssTime" class="form-control" value="60" min="15" max="720" onchange="Cyber.updateSessionRate()">' +
            '<small class="text-muted">Mínimo 15 minutos, máximo 12 horas</small></div>' +
            '<div class="form-group hidden" id="amountGroup">' +
            '<label class="form-label">Monto a Pagar ($)</label>' +
            '<input type="number" id="ssAmount" class="form-control" step="0.01" value="15"></div>' +
            '<div class="form-group"><label class="form-label">Método de Pago</label>' +
            '<select id="ssPayment" class="form-control">' +
            '<option value="cash">💵 Efectivo</option>' +
            '<option value="card">💳 Tarjeta</option>' +
            '<option value="transfer">🏦 Transferencia</option></select></div>' +
            '<div style="background:#1e293b;padding:1rem;border-radius:0.5rem;margin:1rem 0;text-align:center;">' +
            '<div style="font-size:1.25rem;">Costo estimado: <span id="sessionCost" style="color:#10b981;font-weight:bold;">$0.00</span></div></div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">🎮 Iniciar Sesión</button></div></form>';
        app.showModal('Nueva Sesión de Internet', html);
    },

    updateSessionRate: function() {
        var stationSelect = document.getElementById('ssStation');
        var timeInput = document.getElementById('ssTime');
        var costEl = document.getElementById('sessionCost');
        
        if (!stationSelect || !timeInput || !costEl) return;
        
        var selected = stationSelect.selectedOptions[0];
        var rate = parseFloat(selected ? selected.dataset.rate : 0);
        var minutes = parseInt(timeInput.value) || 0;
        var cost = (rate / 60) * minutes;
        
        costEl.textContent = '$' + cost.toFixed(2);
    },

    toggleTimeInput: function() {
        var type = document.getElementById('ssType').value;
        var timeGroup = document.getElementById('timeGroup');
        var amountGroup = document.getElementById('amountGroup');
        if (timeGroup) timeGroup.classList.toggle('hidden', type !== 'time');
        if (amountGroup) amountGroup.classList.toggle('hidden', type !== 'amount');
        if (type === 'time') this.updateSessionRate();
    },

    createSession: function() {
        var self = this;
        var stationId = parseInt(document.getElementById('ssStation').value);
        var type = document.getElementById('ssType').value;
        
        if (!stationId) {
            app.showAlert('Seleccione una estación', 'error');
            return;
        }
        
        var data = {
            station_id: stationId,
            customer_name: document.getElementById('ssCustomer').value,
            session_type: type,
            payment_method: document.getElementById('ssPayment').value
        };

        if (type === 'time') {
            data.time_minutes = parseInt(document.getElementById('ssTime').value);
            if (data.time_minutes < 15) {
                app.showAlert('El tiempo mínimo es 15 minutos', 'error');
                return;
            }
        } else {
            data.amount_paid = parseFloat(document.getElementById('ssAmount').value);
        }

        fetch('api/cyber.php?action=start_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            if (result.success) {
                app.showAlert('Sesión iniciada - Total: $' + parseFloat(result.total_cost).toFixed(2));
                app.closeModal();
                self.loadStations();
                self.loadActiveSessions();
                self.loadQuickStats();
            } else {
                throw new Error(result.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    startSession: function(stationId) {
        var self = this;
        var station = this.stations.find(function(s) { return s.id === stationId; });
        var customer = prompt('Nombre del cliente:') || 'Cliente';
        var minutes = parseInt(prompt('Tiempo en minutos:', '60')) || 60;
        
        if (minutes < 15) {
            app.showAlert('El tiempo mínimo es 15 minutos', 'error');
            return;
        }
        
        fetch('api/cyber.php?action=start_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                station_id: stationId,
                customer_name: customer,
                session_type: 'time',
                time_minutes: minutes,
                payment_method: 'cash'
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            if (result.success) {
                app.showAlert('Sesión iniciada en ' + (station ? station.name : 'estación'));
                self.loadStations();
                self.loadActiveSessions();
                self.loadQuickStats();
            } else {
                throw new Error(result.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    endSession: function(sessionId) {
        var self = this;
        if (!confirm('¿Finalizar esta sesión?')) return;
        
        fetch('api/cyber.php?action=end_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            if (result.success) {
                app.showAlert('Sesión finalizada - Tiempo: ' + result.time_used + ' min - Total: $' + parseFloat(result.total_cost).toFixed(2));
                self.loadStations();
                self.loadActiveSessions();
                self.loadQuickStats();
            } else {
                throw new Error(result.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    endSessionByStation: function(stationId) {
        var session = this.sessions.find(function(s) { return s.station_id === stationId && s.status === 'active'; });
        if (session) {
            this.endSession(session.id);
        } else {
            app.showAlert('No hay sesión activa en esta estación', 'error');
        }
    },

    resumeSession: function(sessionId) {
        var self = this;
        fetch('api/cyber.php?action=resume_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            if (result.success) {
                app.showAlert('Sesión reanudada');
                self.loadActiveSessions();
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    toggleStatus: function(stationId) {
        var self = this;
        fetch('api/cyber.php?action=toggle_station_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: stationId })
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            if (result.success) {
                self.loadStations();
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    }
};
