// js/equipment.js
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
            console.error('Error loading equipment:', e);
            const eqTable = document.getElementById('equipmentTable');
            if (eqTable) eqTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Error cargando equipos</td></tr>';
            const loanTable = document.getElementById('activeLoansTable');
            if (loanTable) loanTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin acceso</td></tr>';
        }
    },

    render: function() {
        // Render Equipment List
        const eqTable = document.getElementById('equipmentTable');
        if(eqTable) {
            eqTable.innerHTML = this.equipments.map(e => `
                <tr>
                    <td>${e.id}</td>
                    <td><strong>${e.name}</strong><br><small class="text-muted">${e.description || '-'}</small></td>
                    <td><span class="badge ${this.getStatusClass(e.status)}">${this.getStatusText(e.status)}</span></td>
                    <td>
                        ${e.status === 'available' ? 
                            `<button class="btn btn-warning btn-sm" onclick="Equipment.toggleStatus(${e.id}, 'maintenance')">Mantenimiento</button>` : 
                          e.status === 'maintenance' ?
                            `<button class="btn btn-success btn-sm" onclick="Equipment.toggleStatus(${e.id}, 'available')">Hacer Disponible</button>` :
                            '-'
                        }
                    </td>
                </tr>
            `).join('');
        }

        // Render Active Loans
        const loanTable = document.getElementById('activeLoansTable');
        if(loanTable) {
            loanTable.innerHTML = this.activeLoans.map(l => `
                <tr>
                    <td>${l.equipment_name}</td>
                    <td>${l.customer_name}</td>
                    <td>${l.start_time}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="Equipment.returnEquipment(${l.id})">Devolver</button>
                    </td>
                </tr>
            `).join('');
        }

        // Expose to global for modals
        window._availableEquipments = this.equipments.filter(e => e.status === 'available');
    },

    getStatusClass: function(status) {
        switch(status) {
            case 'available': return 'badge-success';
            case 'in_use': return 'badge-danger';
            case 'maintenance': return 'badge-warning';
            default: return 'badge-secondary';
        }
    },

    getStatusText: function(status) {
        switch(status) {
            case 'available': return 'Disponible';
            case 'in_use': return 'En Uso';
            case 'maintenance': return 'Mantenimiento';
            default: return status;
        }
    },

    returnEquipment: async function(loanId) {
        if(!confirm('¿Confirmar devolución de equipo?')) return;
        try {
            const res = await fetch('api/equipment.php?action=return_equipment', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ loan_id: loanId })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Equipo devuelto correctamente');
                this.loadData();
            } else throw new Error(data.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    },

    toggleStatus: async function(equipmentId, newStatus) {
        try {
            const res = await fetch('api/equipment.php?action=toggle_status', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ equipment_id: equipmentId, status: newStatus })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Estado actualizado correctamente');
                this.loadData();
            } else throw new Error(data.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    }
};

app.showAddEquipmentModal = function() {
    const html = `
        <form onsubmit="event.preventDefault(); window.Equipment_create()">
            <div class="form-group">
                <label class="form-label">Nombre del Equipo</label>
                <input type="text" id="eqName" class="form-control" placeholder="Ej: Laptop Dell" required>
            </div>
            <div class="form-group">
                <label class="form-label">Descripción</label>
                <input type="text" id="eqDesc" class="form-control" placeholder="Número de serie, modelo, etc.">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar Equipo</button>
            </div>
        </form>
    `;
    app.showModal('Agregar Nuevo Equipo', html);
};

window.Equipment_create = async function() {
    const payload = {
        name: document.getElementById('eqName').value,
        description: document.getElementById('eqDesc').value
    };

    try {
        const res = await fetch('api/equipment.php?action=add_equipment', {
            method: 'POST',
            headers:{ 'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            app.showAlert('Equipo registrado con éxito');
            app.closeModal();
            Equipment.loadData();
        } else throw new Error(data.error);
    } catch(e) {
        app.showAlert(e.message, 'error');
    }
};

app.showLoanModal = function() {
    const available = window._availableEquipments || [];
    if(available.length === 0) {
        app.showAlert('No hay equipos disponibles para préstamo', 'warning');
        return;
    }

    const html = `
        <form onsubmit="event.preventDefault(); window.Equipment_startLoan()">
            <div class="form-group">
                <label class="form-label">Seleccionar Equipo</label>
                <select id="loanEqId" class="form-control" required>
                    ${available.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Nombre del Cliente / Empleado</label>
                <input type="text" id="loanCustomer" class="form-control" placeholder="Quién recibe el equipo" required>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar Préstamo</button>
            </div>
        </form>
    `;
    app.showModal('Nuevo Préstamo de Equipo', html);
};

window.Equipment_startLoan = async function() {
    const payload = {
        equipment_id: document.getElementById('loanEqId').value,
        customer_name: document.getElementById('loanCustomer').value
    };

    try {
        const res = await fetch('api/equipment.php?action=start_loan', {
            method: 'POST',
            headers:{ 'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            app.showAlert('Préstamo registrado con éxito');
            app.closeModal();
            Equipment.loadData();
        } else throw new Error(data.error);
    } catch(e) {
        app.showAlert(e.message, 'error');
    }
};
