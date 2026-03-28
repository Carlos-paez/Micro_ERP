// js/cyber.js - Cibercontrol Module
const Cyber = {
    stations: [],
    sessions: [],
    services: [],
    history: [],

    init: function() {
        this.loadStations();
        this.loadActiveSessions();
        this.loadServices();
    },

    switchTab: function(tabId) {
        document.querySelectorAll('.tabs .tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
        var tab = document.querySelector('.tab[data-tab="' + tabId + '"]');
        if (tab) tab.classList.add('active');
        var content = document.getElementById('tab-' + tabId);
        if (content) content.classList.add('active');
        
        if (tabId === 'sessions') this.loadActiveSessions();
        if (tabId === 'history') this.loadHistory();
        if (tabId === 'services') this.loadServices();
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
            })
            .catch(function(e) {
                console.error('Error loading stations:', e);
                app.showAlert('Error de conexión', 'error');
            });
    },

    renderStations: function() {
        var grid = document.getElementById('stationsGrid');
        if (!grid) return;

        if (this.stations.length === 0) {
            grid.innerHTML = '<div class="empty-state">No hay estaciones configuradas</div>';
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
                actions = '<button class="btn btn-primary btn-sm" onclick="Cyber.startSession(' + s.id + ')">Iniciar Sesión</button>';
            } else if (s.status === 'occupied') {
                actions = '<button class="btn btn-success btn-sm" onclick="Cyber.endSessionByStation(' + s.id + ')">Finalizar</button>';
            } else {
                actions = '<button class="btn btn-secondary btn-sm" onclick="Cyber.toggleStatus(' + s.id + ')">Cambiar Estado</button>';
            }
            
            return '<div class="station-card ' + statusClass + '">' +
                '<div class="station-header">' +
                '<h4>' + s.name + '</h4>' +
                '<span class="status-badge">' + statusText + '</span>' +
                '</div>' +
                '<div class="station-info">' +
                '<p>📍 ' + (s.location || 'Sin ubicación') + '</p>' +
                '<p>💰 $' + parseFloat(s.hourly_rate).toFixed(2) + '/hr</p>' +
                (s.ip_address ? '<p>🌐 ' + s.ip_address + '</p>' : '') +
                '</div>' +
                '<div class="station-actions">' + actions + '</div>' +
                '</div>';
        }).join('');
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
            })
            .catch(function(e) {
                console.error('Error loading sessions:', e);
                app.showAlert('Error de conexión', 'error');
            });
    },

    renderActiveSessions: function() {
        var tables = [
            document.getElementById('activeSessionsTable'),
            document.getElementById('activeSessionsTable2')
        ];
        
        var self = this;
        var tbody;
        if (this.sessions.length === 0) {
            tbody = '<tr><td colspan="4" class="text-center text-muted">No hay sesiones activas</td></tr>';
        } else {
            tbody = this.sessions.map(function(s) {
                var action = s.status === 'paused' ? 
                    '<button class="btn btn-success btn-sm" onclick="Cyber.resumeSession(' + s.id + ')">Reanudar</button>' :
                    '<button class="btn btn-danger btn-sm" onclick="Cyber.endSession(' + s.id + ')">Finalizar</button>';
                return '<tr>' +
                    '<td><strong>' + s.station_name + '</strong></td>' +
                    '<td>' + (s.customer_name || 'Cliente') + '</td>' +
                    '<td>' + (s.elapsed_formatted || '0:00') + '</td>' +
                    '<td>' + action + '</td></tr>';
            }).join('');
        }

        tables.forEach(function(t) { if (t) t.innerHTML = tbody; });
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

        if (this.services.length === 0) {
            grid.innerHTML = '<div class="empty-state">No hay servicios configurados</div>';
            return;
        }

        grid.innerHTML = this.services.map(function(s) {
            return '<div class="service-card">' +
                '<h4>' + s.name + '</h4>' +
                '<p>' + (s.description || '') + '</p>' +
                '<div class="service-price">$' + parseFloat(s.price).toFixed(2) + '</div>' +
                '<button class="btn btn-primary btn-sm" onclick="Cyber.recordService(' + s.id + ', \'' + s.name + '\', ' + s.price + ')">Registrar</button>' +
                '</div>';
        }).join('');
    },

    loadHistory: function() {
        var self = this;
        var dateFrom = document.getElementById('histDateFrom') ? document.getElementById('histDateFrom').value : '';
        var dateTo = document.getElementById('histDateTo') ? document.getElementById('histDateTo').value : '';
        
        fetch('api/cyber.php?action=session_history&date_from=' + dateFrom + '&date_to=' + dateTo)
            .then(function(res) { return res.json(); })
            .then(function(data) {
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
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay registros</td></tr>';
            return;
        }

        var self = this;
        tbody.innerHTML = this.history.map(function(s) {
            var duration = Math.round(s.time_used_seconds / 60);
            return '<tr>' +
                '<td>' + s.station_name + '</td>' +
                '<td>' + (s.customer_name || '-') + '</td>' +
                '<td>' + new Date(s.start_time).toLocaleString() + '</td>' +
                '<td>' + (s.end_time ? new Date(s.end_time).toLocaleString() : '-') + '</td>' +
                '<td>' + duration + ' min</td>' +
                '<td class="text-success">$' + parseFloat(s.total_cost).toFixed(2) + '</td></tr>';
        }).join('');
    },

    showStationModal: function(station) {
        var isEdit = station !== null;
        var name = isEdit ? station.name : '';
        var hostname = isEdit ? (station.hostname || '') : '';
        var ip = isEdit ? (station.ip_address || '') : '';
        var location = isEdit ? (station.location || '') : '';
        var rate = isEdit ? station.hourly_rate : '10.00';
        var id = isEdit ? station.id : 'null';
        
        var html = '<form onsubmit="event.preventDefault(); Cyber.saveStation(' + id + ')">' +
            '<div class="form-group">' +
            '<label class="form-label">Nombre</label>' +
            '<input type="text" id="stName" class="form-control" value="' + name + '" required>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Hostname</label>' +
            '<input type="text" id="stHostname" class="form-control" value="' + hostname + '">' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">IP Address</label>' +
            '<input type="text" id="stIp" class="form-control" value="' + ip + '">' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Ubicación</label>' +
            '<input type="text" id="stLocation" class="form-control" value="' + location + '">' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Tarifa por Hora ($)</label>' +
            '<input type="number" id="stRate" class="form-control" step="0.01" value="' + rate + '" required>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Actualizar' : 'Crear') + '</button>' +
            '</div></form>';
        app.showModal(isEdit ? 'Editar Estación' : 'Nueva Estación', html);
    },

    saveStation: function(id) {
        var self = this;
        var data = {
            name: document.getElementById('stName').value,
            hostname: document.getElementById('stHostname').value,
            ip_address: document.getElementById('stIp').value,
            location: document.getElementById('stLocation').value,
            hourly_rate: parseFloat(document.getElementById('stRate').value)
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
        
        var options = availableStations.map(function(s) {
            return '<option value="' + s.id + '" data-rate="' + s.hourly_rate + '">' + s.name + ' - $' + s.hourly_rate + '/hr</option>';
        }).join('');

        var html = '<form onsubmit="event.preventDefault(); Cyber.createSession()">' +
            '<div class="form-group">' +
            '<label class="form-label">Estación</label>' +
            '<select id="ssStation" class="form-control" required>' +
            '<option value="">-- Seleccionar --</option>' + options +
            '</select></div>' +
            '<div class="form-group">' +
            '<label class="form-label">Nombre del Cliente</label>' +
            '<input type="text" id="ssCustomer" class="form-control"></div>' +
            '<div class="form-group">' +
            '<label class="form-label">Tipo de Sesión</label>' +
            '<select id="ssType" class="form-control" onchange="Cyber.toggleTimeInput()">' +
            '<option value="time">Por Tiempo</option>' +
            '<option value="amount">Por Monto Fijo</option></select></div>' +
            '<div class="form-group" id="timeGroup">' +
            '<label class="form-label">Tiempo (minutos)</label>' +
            '<input type="number" id="ssTime" class="form-control" value="60" min="1"></div>' +
            '<div class="form-group hidden" id="amountGroup">' +
            '<label class="form-label">Monto Fijo ($)</label>' +
            '<input type="number" id="ssAmount" class="form-control" step="0.01" value="10"></div>' +
            '<div class="form-group">' +
            '<label class="form-label">Método de Pago</label>' +
            '<select id="ssPayment" class="form-control">' +
            '<option value="cash">Efectivo</option>' +
            '<option value="card">Tarjeta</option>' +
            '<option value="transfer">Transferencia</option></select></div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">Iniciar Sesión</button></div></form>';
        app.showModal('Nueva Sesión de Internet', html);
    },

    toggleTimeInput: function() {
        var type = document.getElementById('ssType').value;
        document.getElementById('timeGroup').classList.toggle('hidden', type !== 'time');
        document.getElementById('amountGroup').classList.toggle('hidden', type !== 'amount');
    },

    createSession: function() {
        var self = this;
        var stationId = parseInt(document.getElementById('ssStation').value);
        var type = document.getElementById('ssType').value;
        
        var data = {
            station_id: stationId,
            customer_name: document.getElementById('ssCustomer').value,
            session_type: type,
            payment_method: document.getElementById('ssPayment').value
        };

        if (type === 'time') {
            data.time_minutes = parseInt(document.getElementById('ssTime').value);
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
    },

    recordService: function(serviceId, name, price) {
        var qty = parseInt(prompt('Cantidad para ' + name + ':', '1')) || 1;
        var customer = prompt('Nombre del cliente:') || '';
        
        fetch('api/cyber.php?action=record_service', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: serviceId,
                customer_name: customer,
                quantity: qty,
                payment_method: 'cash'
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            if (result.success) {
                app.showAlert('Servicio registrado - Total: $' + parseFloat(result.total).toFixed(2));
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    }
};
