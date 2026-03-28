// js/equipment.js - Equipment Module
const Equipment = {
    equipments: [],
    activeLoans: [],

    init: function() {
        this.loadData();
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
                app.showAlert('Error cargando equipamiento', 'error');
            } else {
                self.equipments = dataEq.equipment || [];
            }
            
            if (dataLoans.error) {
                console.error('Error loans:', dataLoans.error);
            } else {
                self.activeLoans = dataLoans.loans || [];
            }
            
            self.render();
        })
        .catch(function(e) {
            console.error('Error loading equipment:', e);
            app.showAlert('Error de conexión', 'error');
        });
    },

    render: function() {
        this.renderLoans();
        this.renderEquipment();
    },

    renderLoans: function() {
        var tbody = document.getElementById('activeLoansTable');
        if (!tbody) return;

        if (this.activeLoans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay préstamos activos</td></tr>';
            return;
        }

        var self = this;
        tbody.innerHTML = this.activeLoans.map(function(l) {
            return '<tr>' +
                '<td><strong>' + (l.equipment_name || 'N/A') + '</strong></td>' +
                '<td>' + (l.customer_name || 'N/A') + '</td>' +
                '<td>' + new Date(l.start_time).toLocaleString() + '</td>' +
                '<td><button class="btn btn-success btn-sm" onclick="Equipment.returnLoan(' + l.id + ')">Devolver</button></td></tr>';
        }).join('');
    },

    renderEquipment: function() {
        var tbody = document.getElementById('equipmentTable');
        if (!tbody) return;

        if (this.equipments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay equipos registrados</td></tr>';
            return;
        }

        var self = this;
        tbody.innerHTML = this.equipments.map(function(e, index) {
            var statusClass = e.status === 'available' ? 'badge-success' : 
                             e.status === 'in_use' ? 'badge-warning' : 
                             e.status === 'maintenance' ? 'badge-danger' : 'badge-secondary';
            var statusText = e.status === 'available' ? 'Disponible' : 
                            e.status === 'in_use' ? 'En uso' : 
                            e.status === 'maintenance' ? 'Mantenimiento' : 
                            e.status === 'cleaning' ? 'Limpieza' : e.status;
            
            var actions = '';
            if (e.status === 'available') {
                actions = '<button class="btn btn-primary btn-sm" onclick="Equipment.showLoanModal(' + e.id + ')">Prestar</button>';
            } else if (e.status === 'in_use') {
                actions = '<span class="badge badge-warning">En préstamo</span>';
            } else {
                actions = '<button class="btn btn-secondary btn-sm" onclick="Equipment.toggleStatus(' + e.id + ', \'available\')">Activar</button>';
            }
            
            return '<tr>' +
                '<td>' + (index + 1) + '</td>' +
                '<td><strong>' + e.name + '</strong><br><small class="text-muted">' + (e.description || '') + '</small></td>' +
                '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
                '<td>' + actions + '</td></tr>';
        }).join('');
    },

    showLoanModal: function(equipmentId) {
        var html = '<form onsubmit="event.preventDefault(); Equipment.startLoan(' + equipmentId + ')">' +
            '<div class="form-group">' +
            '<label class="form-label">Nombre del Cliente</label>' +
            '<input type="text" id="loanCustomer" class="form-control" placeholder="Nombre completo" required>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">Iniciar Préstamo</button>' +
            '</div></form>';
        app.showModal('Registrar Préstamo', html);
    },

    startLoan: function(equipmentId) {
        var self = this;
        var customerName = document.getElementById('loanCustomer').value;

        fetch('api/equipment.php?action=start_loan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipment_id: equipmentId,
                customer_name: customerName
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                app.showAlert('Préstamo iniciado');
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

    toggleStatus: function(equipmentId, status) {
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

    showAddModal: function() {
        app.showAddEquipmentModal();
    }
};

app.showAddEquipmentModal = function() {
    var html = '<form onsubmit="event.preventDefault(); Equipment.createEquipment()">' +
        '<div class="form-group">' +
        '<label class="form-label">Nombre del Equipo</label>' +
        '<input type="text" id="eqName" class="form-control" placeholder="Ej: Laptop Dell" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label class="form-label">Descripción</label>' +
        '<textarea id="eqDesc" class="form-control" placeholder="Número de serie, modelo, etc."></textarea>' +
        '</div>' +
        '<div class="modal-footer">' +
        '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
        '<button type="submit" class="btn btn-primary">Agregar</button>' +
        '</div></form>';
    app.showModal('Agregar Equipo', html);
};

Equipment.createEquipment = function() {
    var self = this;
    var name = document.getElementById('eqName').value;
    var description = document.getElementById('eqDesc').value;

    fetch('api/equipment.php?action=add_equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            description: description
        })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            app.showAlert('Equipo agregado');
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
