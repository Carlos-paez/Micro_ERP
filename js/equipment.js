// js/equipment.js - Enhanced Equipment Management Module
const Equipment = {
    activeLoans: [],
    equipments: [],

    init: async function() {
        await this.loadData();
    },

    loadData: async function() {
        try {
            const [resEq, resLoans] = await Promise.all([
                fetch('api/equipment.php?action=list').then(r => r.json()),
                fetch('api/equipment.php?action=active_loans').then(r => r.json())
            ]);

            this.equipments = resEq.equipment || [];
            this.activeLoans = resLoans.loans || [];
            this.render();
        } catch (e) {
            app.showAlert('Error cargando equipos', 'error');
        }
    },

    render: function() {
        this.renderEquipmentList();
        this.renderActiveLoans();
        window._availableEquipments = this.equipments.filter(e => e.status === 'available');
    },

    renderEquipmentList: function() {
        const eqTable = document.getElementById('equipmentTable');
        if (!eqTable) return;

        if (this.equipments.length === 0) {
            eqTable.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay equipos registrados</td></tr>';
            return;
        }

        eqTable.innerHTML = this.equipments.map(e => `
            <tr>
                <td style="font-weight: 500;">${e.name}</td>
                <td>${e.category || '-'}</td>
                <td>${e.serial_number || '-'}</td>
                <td><span class="badge ${this.getStatusClass(e.status)}">${this.getStatusText(e.status)}</span></td>
                <td class="text-primary">$${parseFloat(e.hourly_rate || 0).toFixed(2)}/hr</td>
                <td>
                    <div class="action-buttons">
                        ${e.status === 'available' ? 
                            `<button class="btn btn-warning btn-sm" onclick="Equipment.toggleStatus(${e.id}, 'maintenance')" title="Mantenimiento">🔧</button>` : 
                          e.status === 'maintenance' ?
                            `<button class="btn btn-success btn-sm" onclick="Equipment.toggleStatus(${e.id}, 'available')" title="Disponible">✓</button>` :
                            `<button class="btn btn-secondary btn-sm" onclick="Equipment.toggleStatus(${e.id}, 'cleaning')" title="Limpieza">🧹</button>`
                        }
                        <button class="btn btn-danger btn-sm" onclick="Equipment.deleteEquipment(${e.id})" title="Eliminar">🗑</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    renderActiveLoans: function() {
        const loanTable = document.getElementById('activeLoansTable');
        if (!loanTable) return;

        if (this.activeLoans.length === 0) {
            loanTable.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay préstamos activos</td></tr>';
            return;
        }

        loanTable.innerHTML = this.activeLoans.map(l => {
            const startDate = new Date(l.start_time);
            const now = new Date();
            const hours = Math.round((now - startDate) / (1000 * 60 * 60) * 10) / 10;
            const estimatedCost = hours * parseFloat(l.hourly_rate || 0);
            
            return `
                <tr>
                    <td style="font-weight: 500;">${l.equipment_name}</td>
                    <td>${l.customer_name}</td>
                    <td>${l.customer_phone || '-'}</td>
                    <td class="text-muted">${startDate.toLocaleString()}</td>
                    <td>${hours.toFixed(1)} hrs</td>
                    <td class="text-success">$${estimatedCost.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="Equipment.returnEquipment(${l.id})">Devolver</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    getStatusClass: function(status) {
        const classes = {
            'available': 'badge-success',
            'in_use': 'badge-danger',
            'maintenance': 'badge-warning',
            'cleaning': 'badge-info',
            'retired': 'badge-secondary'
        };
        return classes[status] || 'badge-secondary';
    },

    getStatusText: function(status) {
        const texts = {
            'available': 'Disponible',
            'in_use': 'En Uso',
            'maintenance': 'Mantenimiento',
            'cleaning': 'Limpieza',
            'retired': 'Retirado'
        };
        return texts[status] || status;
    },

    returnEquipment: async function(loanId) {
        if (!confirm('¿Confirmar devolución de equipo?')) return;
        try {
            const res = await fetch('api/equipment.php?action=return_equipment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loan_id: loanId })
            });
            const data = await res.json();
            if (data.success) {
                app.showAlert('Equipo devuelto correctamente');
                this.loadData();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    toggleStatus: async function(equipmentId, newStatus) {
        try {
            const res = await fetch('api/equipment.php?action=toggle_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ equipment_id: equipmentId, status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                app.showAlert('Estado actualizado');
                this.loadData();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    deleteEquipment: async function(equipmentId) {
        if (!confirm('¿Eliminar este equipo?')) return;
        try {
            const res = await fetch('api/equipment.php?action=delete_equipment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ equipment_id: equipmentId })
            });
            const data = await res.json();
            if (data.success) {
                app.showAlert('Equipo eliminado');
                this.loadData();
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    }
};

app.showAddModal = function() {
    const html = `
        <form onsubmit="event.preventDefault(); Equipment.createEquipment()">
            <div class="form-group">
                <label class="form-label">Nombre del Equipo *</label>
                <input type="text" id="eqName" class="form-control" required>
            </div>
            <div class="form-group">
                <label class="form-label">Descripción</label>
                <input type="text" id="eqDesc" class="form-control">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Número de Serie</label>
                    <input type="text" id="eqSerial" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label">Categoría</label>
                    <input type="text" id="eqCategory" class="form-control">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Fecha de Compra</label>
                    <input type="date" id="eqPurchaseDate" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label">Tarifa por Hora</label>
                    <input type="number" id="eqRate" class="form-control" step="0.01" value="10.00">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Ubicación</label>
                <input type="text" id="eqLocation" class="form-control">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear Equipo</button>
            </div>
        </form>
    `;
    app.showModal('Agregar Nuevo Equipo', html);
};

Equipment.createEquipment = async function() {
    const payload = {
        name: document.getElementById('eqName').value,
        description: document.getElementById('eqDesc').value,
        serial_number: document.getElementById('eqSerial').value,
        category: document.getElementById('eqCategory').value,
        purchase_date: document.getElementById('eqPurchaseDate').value,
        hourly_rate: parseFloat(document.getElementById('eqRate').value) || 10,
        location: document.getElementById('eqLocation').value
    };

    try {
        const res = await fetch('api/equipment.php?action=add_equipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            app.showAlert('Equipo registrado');
            app.closeModal();
            Equipment.loadData();
        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        app.showAlert(e.message, 'error');
    }
};

app.showLoanModal = function() {
    const available = window._availableEquipments || [];
    if (available.length === 0) {
        app.showAlert('No hay equipos disponibles', 'warning');
        return;
    }

    const html = `
        <form onsubmit="event.preventDefault(); Equipment.startLoan()">
            <div class="form-group">
                <label class="form-label">Equipo *</label>
                <select id="loanEqId" class="form-control" required>
                    <option value="">-- Seleccionar --</option>
                    ${available.map(e => `<option value="${e.id}" data-rate="${e.hourly_rate || 0}">${e.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Nombre del Cliente *</label>
                <input type="text" id="loanCustomer" class="form-control" required>
            </div>
            <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input type="text" id="loanPhone" class="form-control">
            </div>
            <div class="form-group">
                <label class="form-label">Documento</label>
                <input type="text" id="loanDoc" class="form-control">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar Préstamo</button>
            </div>
        </form>
    `;
    app.showModal('Nuevo Préstamo de Equipo', html);
};

Equipment.startLoan = async function() {
    const payload = {
        equipment_id: parseInt(document.getElementById('loanEqId').value),
        customer_name: document.getElementById('loanCustomer').value,
        customer_phone: document.getElementById('loanPhone').value,
        customer_document: document.getElementById('loanDoc').value
    };

    try {
        const res = await fetch('api/equipment.php?action=start_loan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            app.showAlert('Préstamo registrado');
            app.closeModal();
            Equipment.loadData();
        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        app.showAlert(e.message, 'error');
    }
};

window.Equipment = Equipment;
