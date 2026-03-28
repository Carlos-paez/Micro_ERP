// js/equipment.js - Equipment Module
const Equipment = {
    equipments: [],
    activeLoans: [],
    currentTab: 'loans',

    init: function() {
        this.loadData();
    },

    switchTab: function(tabId) {
        this.currentTab = tabId;
        var container = document.getElementById('view-equipment');
        if (!container) return;
        
        container.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        container.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
        
        var tab = container.querySelector('.tab[data-tab="' + tabId + '"]');
        if (tab) tab.classList.add('active');
        var content = document.getElementById('tab-' + tabId);
        if (content) content.classList.add('active');
        
        if (tabId === 'loans') this.renderLoans();
        if (tabId === 'inventory') this.renderEquipment();
    },

    loadData: function() {
        var self = this;
        
        Promise.all([
            fetch('api/equipment.php?action=list').then(function(res) { return res.json(); }),
            fetch('api/equipment.php?action=active_loans').then(function(res) { return res.json(); })
        ])
        .then(function(results) {
            var dataEq = results[0];
            var dataLoans = results[1];
            
            if (dataEq.error) {
                console.error('Error equipment:', dataEq.error);
            } else {
                self.equipments = dataEq.equipment || [];
            }
            
            if (dataLoans.error) {
                console.error('Error loans:', dataLoans.error);
            } else {
                self.activeLoans = dataLoans.loans || [];
            }
            
            self.updateStats();
            self.render();
        })
        .catch(function(e) {
            console.error('Error loading equipment:', e);
            app.showAlert('Error de conexión', 'error');
        });
    },

    updateStats: function() {
        var total = this.equipments.length;
        var available = this.equipments.filter(function(e) { return e.status === 'available'; }).length;
        var inUse = this.equipments.filter(function(e) { return e.status === 'in_use'; }).length;
        var maintenance = this.equipments.filter(function(e) { return e.status === 'maintenance'; }).length;
        
        var statTotal = document.getElementById('statTotalEquipment');
        var statAvail = document.getElementById('statAvailableEquipment');
        var statLoan = document.getElementById('statLoanedEquipment');
        var statMaint = document.getElementById('statMaintenanceEquipment');
        
        if (statTotal) statTotal.textContent = total;
        if (statAvail) statAvail.textContent = available;
        if (statLoan) statLoan.textContent = inUse;
        if (statMaint) statMaint.textContent = maintenance;
    },

    render: function() {
        if (this.currentTab === 'loans') this.renderLoans();
        if (this.currentTab === 'inventory') this.renderEquipment();
    },

    renderLoans: function() {
        var tbody = document.getElementById('activeLoansTable');
        if (!tbody) return;

        if (this.activeLoans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay préstamos activos</td></tr>';
            return;
        }

        var self = this;
        tbody.innerHTML = this.activeLoans.map(function(l) {
            var startDate = new Date(l.start_time);
            return '<tr>' +
                '<td><strong>' + self.escapeHtml(l.equipment_name || 'N/A') + '</strong></td>' +
                '<td>' + self.escapeHtml(l.customer_name || 'N/A') + '</td>' +
                '<td>' + self.escapeHtml(l.customer_phone || '-') + '</td>' +
                '<td>' + startDate.toLocaleDateString() + ' ' + startDate.toLocaleTimeString() + '</td>' +
                '<td><button class="btn btn-success btn-sm" onclick="Equipment.returnLoan(' + l.id + ')">↩️ Devolver</button></td></tr>';
        }).join('');
    },

    escapeHtml: function(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    renderEquipment: function() {
        var tbody = document.getElementById('equipmentTable');
        if (!tbody) return;

        if (this.equipments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay equipos registrados</td></tr>';
            return;
        }

        var self = this;
        tbody.innerHTML = this.equipments.map(function(e, index) {
            var statusClass = e.status === 'available' ? 'badge-success' : 
                             e.status === 'in_use' ? 'badge-warning' : 
                             e.status === 'maintenance' ? 'badge-danger' : 
                             e.status === 'cleaning' ? 'badge-info' : 'badge-secondary';
            var statusText = e.status === 'available' ? 'Disponible' : 
                            e.status === 'in_use' ? 'En uso' : 
                            e.status === 'maintenance' ? 'Mantenimiento' : 
                            e.status === 'cleaning' ? 'Limpieza' : 
                            e.status === 'retired' ? 'Retirado' : e.status;
            
            var actions = '';
            if (e.status === 'available') {
                actions = '<button class="btn btn-primary btn-sm" onclick="Equipment.showLoanModal(' + e.id + ')">📋 Prestar</button> ';
            } else if (e.status === 'in_use') {
                actions = '<span class="badge badge-warning">En préstamo</span> ';
            } else {
                actions = '<button class="btn btn-secondary btn-sm" onclick="Equipment.setStatus(' + e.id + ', \'available\')">✓ Activar</button> ';
            }
            actions += '<button class="btn btn-warning btn-sm" onclick="Equipment.setStatus(' + e.id + ', \'maintenance\')">🔧</button>';
            
            return '<tr>' +
                '<td>' + (index + 1) + '</td>' +
                '<td><strong>' + self.escapeHtml(e.name) + '</strong></td>' +
                '<td><small>' + self.escapeHtml(e.description || '-') + '</small></td>' +
                '<td><span class="badge badge-secondary">' + self.escapeHtml(e.category || 'General') + '</span></td>' +
                '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
                '<td>' + self.escapeHtml(e.location || '-') + '</td>' +
                '<td>' + actions + '</td></tr>';
        }).join('');
    },

    showLoanModal: function(equipmentId) {
        var equipment = this.equipments.find(function(e) { return e.id === equipmentId; });
        var self = this;
        
        var html = '<form onsubmit="event.preventDefault(); Equipment.startLoan(' + equipmentId + ')">' +
            '<h3>' + self.escapeHtml(equipment ? equipment.name : 'Equipo') + '</h3>' +
            '<hr style="border-color:#334155;">' +
            '<div class="form-group"><label class="form-label">Nombre del Cliente *</label>' +
            '<input type="text" id="loanCustomer" class="form-control" placeholder="Nombre completo" required></div>' +
            '<div class="form-group"><label class="form-label">Teléfono de Contacto</label>' +
            '<input type="text" id="loanPhone" class="form-control" placeholder="Teléfono"></div>' +
            '<div class="form-group"><label class="form-label">Documento (opcional)</label>' +
            '<input type="text" id="loanDoc" class="form-control" placeholder="INE, pasaporte, etc."></div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">📋 Iniciar Préstamo</button></div></form>';
        app.showModal('Registrar Préstamo', html);
    },

    startLoan: function(equipmentId) {
        var self = this;
        var customerName = document.getElementById('loanCustomer').value;
        var phone = document.getElementById('loanPhone') ? document.getElementById('loanPhone').value : '';
        var doc = document.getElementById('loanDoc') ? document.getElementById('loanDoc').value : '';

        fetch('api/equipment.php?action=start_loan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipment_id: equipmentId,
                customer_name: customerName,
                customer_phone: phone,
                customer_document: doc
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                app.showAlert('Préstamo iniciado correctamente');
                app.closeModal();
                self.loadData();
            } else {
                throw new Error(data.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    returnLoan: function(loanId) {
        var self = this;
        if (!confirm('¿Confirmar devolución del equipo?')) return;

        fetch('api/equipment.php?action=return_equipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loan_id: loanId })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                app.showAlert('Equipo devuelto correctamente');
                self.loadData();
            } else {
                throw new Error(data.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    setStatus: function(equipmentId, status) {
        var self = this;
        fetch('api/equipment.php?action=toggle_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipment_id: equipmentId,
                status: status
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                app.showAlert('Estado actualizado');
                self.loadData();
            } else {
                throw new Error(data.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    toggleStatus: function(equipmentId, status) {
        this.setStatus(equipmentId, status);
    },

    showAddModal: function() {
        app.showAddEquipmentModal();
    }
};

app.showAddEquipmentModal = function() {
    var html = '<form onsubmit="event.preventDefault(); Equipment.createEquipment()">' +
        '<div class="form-group"><label class="form-label">Nombre del Equipo *</label>' +
        '<input type="text" id="eqName" class="form-control" placeholder="Ej: Proyector Epson" required></div>' +
        '<div class="form-group"><label class="form-label">Descripción / Modelo</label>' +
        '<textarea id="eqDesc" class="form-control" placeholder="Número de serie, marca, modelo, características..."></textarea></div>' +
        '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">Categoría</label>' +
        '<select id="eqCategory" class="form-control">' +
        '<option value="">General</option>' +
        '<option value="proyeccion">Proyección</option>' +
        '<option value="fotografia">Fotografía</option>' +
        '<option value="audio">Audio</option>' +
        '<option value="computo">Cómputo</option>' +
        '<option value="video">Video</option>' +
        '<option value="otro">Otro</option></select></div>' +
        '<div class="form-group" style="flex:1;"><label class="form-label">Ubicación</label>' +
        '<input type="text" id="eqLocation" class="form-control" placeholder="Ej: Almacén A"></div></div>' +
        '<div class="form-group"><label class="form-label">Número de Serie</label>' +
        '<input type="text" id="eqSerial" class="form-control" placeholder="Número de serie"></div>' +
        '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">Fecha de Compra</label>' +
        '<input type="date" id="eqPurchase" class="form-control"></div>' +
        '<div class="form-group" style="flex:1;"><label class="form-label">Garantía Hasta</label>' +
        '<input type="date" id="eqWarranty" class="form-control"></div></div>' +
        '<div class="modal-footer">' +
        '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
        '<button type="submit" class="btn btn-primary">Agregar Equipo</button></div></form>';
    app.showModal('Agregar Equipo', html);
};

Equipment.createEquipment = function() {
    var self = this;
    var name = document.getElementById('eqName').value;
    var description = document.getElementById('eqDesc') ? document.getElementById('eqDesc').value : '';
    var category = document.getElementById('eqCategory') ? document.getElementById('eqCategory').value : '';
    var location = document.getElementById('eqLocation') ? document.getElementById('eqLocation').value : '';
    var serial = document.getElementById('eqSerial') ? document.getElementById('eqSerial').value : '';

    fetch('api/equipment.php?action=add_equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            description: description,
            category: category,
            location: location,
            serial_number: serial
        })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            app.showAlert('Equipo agregado correctamente');
            app.closeModal();
            Equipment.loadData();
        } else {
            throw new Error(data.error);
        }
    })
    .catch(function(e) {
        app.showAlert(e.message, 'error');
    });
};
