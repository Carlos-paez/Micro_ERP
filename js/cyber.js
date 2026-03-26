// js/cyber.js - Cibercontrol Module
const Cyber = {
    stations: [],
    sessions: [],
    services: [],
    history: [],

    init: async function() {
        await this.loadStations();
        await this.loadActiveSessions();
        await this.loadServices();
        this.setupDates();
    },

    setupDates: function() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('histDateFrom').value = today;
        document.getElementById('histDateTo').value = today;
    },

    switchTab: function(tabId) {
        document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');
        
        if (tabId === 'sessions') this.loadActiveSessions();
        if (tabId === 'history') this.loadHistory();
        if (tabId === 'services') this.loadServices();
    },

    loadStations: async function() {
        try {
            const res = await fetch('api/cyber.php?action=list_stations');
            const data = await res.json();
            this.stations = data.stations || [];
            this.renderStations();
        } catch (e) {
            app.showAlert('Error cargando estaciones', 'error');
        }
    },

    renderStations: function() {
        const grid = document.getElementById('stationsGrid');
        if (!grid) return;

        if (this.stations.length === 0) {
            grid.innerHTML = '<div class="empty-state">No hay estaciones configuradas</div>';
            return;
        }

        grid.innerHTML = this.stations.map(s => {
            const statusClass = s.status === 'available' ? 'status-available' : 
                               s.status === 'occupied' ? 'status-occupied' : 
                               s.status === 'maintenance' ? 'status-maintenance' : 'status-offline';
            const statusText = s.status === 'available' ? 'Disponible' : 
                              s.status === 'occupied' ? 'Ocupado' : 
                              s.status === 'maintenance' ? 'Mantenimiento' : 'Fuera de línea';
            
            return `
                <div class="station-card ${statusClass}">
                    <div class="station-header">
                        <h4>${s.name}</h4>
                        <span class="status-badge">${statusText}</span>
                    </div>
                    <div class="station-info">
                        <p>📍 ${s.location || 'Sin ubicación'}</p>
                        <p>💰 $${parseFloat(s.hourly_rate).toFixed(2)}/hr</p>
                        ${s.ip_address ? `<p>🌐 ${s.ip_address}</p>` : ''}
                    </div>
                    <div class="station-actions">
                        ${s.status === 'available' ? 
                            `<button class="btn btn-primary btn-sm" onclick="Cyber.startSession(${s.id})">Iniciar Sesión</button>` :
                            s.status === 'occupied' ?
                            `<button class="btn btn-success btn-sm" onclick="Cyber.endSessionByStation(${s.id})">Finalizar</button>` :
                            `<button class="btn btn-secondary btn-sm" onclick="Cyber.toggleStatus(${s.id})">Cambiar Estado</button>`
                        }
                    </div>
                </div>
            `;
        }).join('');
    },

    loadActiveSessions: async function() {
        try {
            const res = await fetch('api/cyber.php?action=active_sessions');
            const data = await res.json();
            this.sessions = data.sessions || [];
            this.renderActiveSessions();
        } catch (e) {
            app.showAlert('Error cargando sesiones', 'error');
        }
    },

    renderActiveSessions: function() {
        const tables = [
            document.getElementById('activeSessionsTable'),
            document.getElementById('activeSessionsTable2')
        ];
        
        const tbody = this.sessions.length === 0 ? 
            '<tr><td colspan="4" class="text-center text-muted">No hay sesiones activas</td></tr>' :
            this.sessions.map(s => `
                <tr>
                    <td><strong>${s.station_name}</strong></td>
                    <td>${s.customer_name || 'Cliente'}</td>
                    <td>${s.elapsed_formatted || '0:00'}</td>
                    <td>
                        ${s.status === 'paused' ? 
                            `<button class="btn btn-success btn-sm" onclick="Cyber.resumeSession(${s.id})">Reanudar</button>` :
                            `<button class="btn btn-danger btn-sm" onclick="Cyber.endSession(${s.id})">Finalizar</button>`
                        }
                    </td>
                </tr>
            `).join('');

        tables.forEach(t => { if (t) t.innerHTML = tbody; });
    },

    loadServices: async function() {
        try {
            const res = await fetch('api/cyber.php?action=list_services');
            const data = await res.json();
            this.services = data.services || [];
            this.renderServices();
        } catch (e) {
            app.showAlert('Error cargando servicios', 'error');
        }
    },

    renderServices: function() {
        const grid = document.getElementById('servicesGrid');
        if (!grid) return;

        if (this.services.length === 0) {
            grid.innerHTML = '<div class="empty-state">No hay servicios configurados</div>';
            return;
        }

        grid.innerHTML = this.services.map(s => `
            <div class="service-card">
                <h4>${s.name}</h4>
                <p>${s.description || ''}</p>
                <div class="service-price">$${parseFloat(s.price).toFixed(2)}</div>
                <button class="btn btn-primary btn-sm" onclick="Cyber.recordService(${s.id}, '${s.name}', ${s.price})">
                    Registrar
                </button>
            </div>
        `).join('');
    },

    loadHistory: async function() {
        const dateFrom = document.getElementById('histDateFrom').value;
        const dateTo = document.getElementById('histDateTo').value;
        
        try {
            const res = await fetch(`api/cyber.php?action=session_history&date_from=${dateFrom}&date_to=${dateTo}`);
            const data = await res.json();
            this.history = data.sessions || [];
            this.renderHistory();
        } catch (e) {
            app.showAlert('Error cargando historial', 'error');
        }
    },

    renderHistory: function() {
        const tbody = document.getElementById('historyTable');
        if (!tbody) return;

        if (this.history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay registros</td></tr>';
            return;
        }

        tbody.innerHTML = this.history.map(s => {
            const duration = Math.round(s.time_used_seconds / 60);
            return `
                <tr>
                    <td>${s.station_name}</td>
                    <td>${s.customer_name || '-'}</td>
                    <td>${new Date(s.start_time).toLocaleString()}</td>
                    <td>${s.end_time ? new Date(s.end_time).toLocaleString() : '-'}</td>
                    <td>${duration} min</td>
                    <td class="text-success">$${parseFloat(s.total_cost).toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    },

    showStationModal: function(station = null) {
        const isEdit = station !== null;
        const html = `
            <form onsubmit="event.preventDefault(); Cyber.saveStation(${isEdit ? station.id : 'null'})">
                <div class="form-group">
                    <label class="form-label">Nombre</label>
                    <input type="text" id="stName" class="form-control" value="${isEdit ? station.name : ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Hostname</label>
                    <input type="text" id="stHostname" class="form-control" value="${isEdit ? station.hostname || '' : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">IP Address</label>
                    <input type="text" id="stIp" class="form-control" value="${isEdit ? station.ip_address || '' : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Ubicación</label>
                    <input type="text" id="stLocation" class="form-control" value="${isEdit ? station.location || '' : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Tarifa por Hora ($)</label>
                    <input type="number" id="stRate" class="form-control" step="0.01" value="${isEdit ? station.hourly_rate : '10.00'}" required>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                </div>
            </form>
        `;
        app.showModal(isEdit ? 'Editar Estación' : 'Nueva Estación', html);
    },

    saveStation: async function(id) {
        const data = {
            name: document.getElementById('stName').value,
            hostname: document.getElementById('stHostname').value,
            ip_address: document.getElementById('stIp').value,
            location: document.getElementById('stLocation').value,
            hourly_rate: parseFloat(document.getElementById('stRate').value)
        };

        try {
            const action = id ? 'update_station' : 'create_station';
            if (id) data.id = id;

            const res = await fetch(`api/cyber.php?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                app.showAlert(result.message);
                app.closeModal();
                this.loadStations();
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    showSessionModal: function() {
        const availableStations = this.stations.filter(s => s.status === 'available');
        
        const html = `
            <form onsubmit="event.preventDefault(); Cyber.createSession()">
                <div class="form-group">
                    <label class="form-label">Estación</label>
                    <select id="ssStation" class="form-control" required>
                        <option value="">-- Seleccionar --</option>
                        ${availableStations.map(s => `<option value="${s.id}" data-rate="${s.hourly_rate}">${s.name} - $${s.hourly_rate}/hr</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Nombre del Cliente</label>
                    <input type="text" id="ssCustomer" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Sesión</label>
                    <select id="ssType" class="form-control" onchange="Cyber.toggleTimeInput()">
                        <option value="time">Por Tiempo</option>
                        <option value="amount">Por Monto Fijo</option>
                    </select>
                </div>
                <div class="form-group" id="timeGroup">
                    <label class="form-label">Tiempo (minutos)</label>
                    <input type="number" id="ssTime" class="form-control" value="60" min="1">
                </div>
                <div class="form-group hidden" id="amountGroup">
                    <label class="form-label">Monto Fijo ($)</label>
                    <input type="number" id="ssAmount" class="form-control" step="0.01" value="10">
                </div>
                <div class="form-group">
                    <label class="form-label">Método de Pago</label>
                    <select id="ssPayment" class="form-control">
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Iniciar Sesión</button>
                </div>
            </form>
        `;
        app.showModal('Nueva Sesión de Internet', html);
    },

    toggleTimeInput: function() {
        const type = document.getElementById('ssType').value;
        document.getElementById('timeGroup').classList.toggle('hidden', type !== 'time');
        document.getElementById('amountGroup').classList.toggle('hidden', type !== 'amount');
    },

    createSession: async function() {
        const stationId = parseInt(document.getElementById('ssStation').value);
        const type = document.getElementById('ssType').value;
        
        const data = {
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

        try {
            const res = await fetch('api/cyber.php?action=start_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                app.showAlert(`Sesión iniciada - Total: $${parseFloat(result.total_cost).toFixed(2)}`);
                app.closeModal();
                this.loadStations();
                this.loadActiveSessions();
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    startSession: async function(stationId) {
        const station = this.stations.find(s => s.id === stationId);
        const customer = prompt('Nombre del cliente:') || 'Cliente';
        const minutes = parseInt(prompt('Tiempo en minutos:', '60')) || 60;
        
        try {
            const res = await fetch('api/cyber.php?action=start_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    station_id: stationId,
                    customer_name: customer,
                    session_type: 'time',
                    time_minutes: minutes,
                    payment_method: 'cash'
                })
            });
            const result = await res.json();
            if (result.success) {
                app.showAlert(`Sesión iniciada en ${station.name}`);
                this.loadStations();
                this.loadActiveSessions();
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    endSession: async function(sessionId) {
        if (!confirm('¿Finalizar esta sesión?')) return;
        
        try {
            const res = await fetch('api/cyber.php?action=end_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
            const result = await res.json();
            if (result.success) {
                app.showAlert(`Sesión finalizada - Tiempo: ${result.time_used} min - Total: $${parseFloat(result.total_cost).toFixed(2)}`);
                this.loadStations();
                this.loadActiveSessions();
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    endSessionByStation: async function(stationId) {
        const session = this.sessions.find(s => s.station_id === stationId && s.status === 'active');
        if (session) {
            await this.endSession(session.id);
        }
    },

    resumeSession: async function(sessionId) {
        try {
            const res = await fetch('api/cyber.php?action=resume_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
            const result = await res.json();
            if (result.success) {
                app.showAlert('Sesión reanudada');
                this.loadActiveSessions();
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    toggleStatus: async function(stationId) {
        try {
            const res = await fetch('api/cyber.php?action=toggle_station_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: stationId })
            });
            const result = await res.json();
            if (result.success) {
                this.loadStations();
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    recordService: function(serviceId, name, price) {
        const qty = parseInt(prompt(`Cantidad para ${name}:`, '1')) || 1;
        const customer = prompt('Nombre del cliente:') || '';
        
        fetch('api/cyber.php?action=record_service', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: serviceId,
                customer_name: customer,
                quantity: qty,
                payment_method: 'cash'
            })
        }).then(r => r.json()).then(result => {
            if (result.success) {
                app.showAlert(`Servicio registrado - Total: $${parseFloat(result.total).toFixed(2)}`);
            }
        }).catch(e => app.showAlert(e.message, 'error'));
    }
};

window.Cyber = Cyber;
