// js/equipment.js
const Equipment = {
    timerInterval: null,
    activeLoans: [],

    init: async function() {
        if(this.timerInterval) clearInterval(this.timerInterval);
        await this.loadData();
        
        // Start checker for alerts
        this.timerInterval = setInterval(() => this.checkExpirations(), 5000); // Check every 5s
    },

    loadData: async function() {
        try {
            const [resEq, resLoans] = await Promise.all([
                fetch('api/equipment.php?action=list').then(r => r.json()),
                fetch('api/equipment.php?action=active_loans').then(r => r.json())
            ]);

            this.renderEquipment(resEq.equipment || []);
            this.activeLoans = resLoans.loans || [];
            this.renderLoans();
        } catch (e) {
            console.error(e);
        }
    },

    renderEquipment: function(equipments) {
        const tbody = document.getElementById('equipmentTable');
        if(!tbody) return;

        tbody.innerHTML = equipments.map(e => {
            const statusClass = e.status === 'available' ? 'badge-success' : (e.status === 'maintenance' ? 'badge-warning' : 'badge-danger');
            const statusText = e.status === 'available' ? 'Disponible' : (e.status === 'in_use' ? 'En Uso' : 'Mant.');
            
            // Generate toggle action
            let actionHtml = '';
            if (e.status === 'available') {
                actionHtml = `<button class="btn btn-warning" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="Equipment.toggleStatus(${e.id}, 'maintenance')">En Mantenimiento</button>`;
            } else if (e.status === 'maintenance') {
                actionHtml = `<button class="btn btn-success" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="Equipment.toggleStatus(${e.id}, 'available')">Hacer Disponible</button>`;
            }

            return `
                <tr>
                    <td>#${e.id}</td>
                    <td style="font-weight: 500;">${e.name}</td>
                    <td class="text-muted text-sm">${e.description}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        }).join('');

        // Expose to global for modals
        window._availableEquipments = equipments.filter(e => e.status === 'available');
    },

    renderLoans: function() {
        const grid = document.getElementById('activeLoansGrid');
        if(!grid) return;

        if(this.activeLoans.length === 0) {
            grid.innerHTML = '<div class="text-muted">No hay préstamos activos.</div>';
            return;
        }

        grid.innerHTML = this.activeLoans.map(l => {
            const end = new Date(l.end_time);
            return `
                <div class="stat-card" style="padding: 1rem; position: relative;">
                    <div style="font-size: 0.8rem;" class="text-muted">Préstamo #${l.id}</div>
                    <div style="font-weight: 600; font-size: 1.1rem; margin: 0.25rem 0;">${l.equipment_name}</div>
                    <div style="font-size: 0.85rem;" class="mb-2">Usuario: <strong>${l.customer_name}</strong></div>
                    <div class="badge badge-warning mb-2">Finaliza: ${end.toLocaleTimeString()}</div>
                    <div style="text-align: right; margin-top: auto;">
                        <button class="btn btn-danger" style="font-size: 0.75rem" onclick="Equipment.returnEquipment(${l.id})">Finalizar/Devolver</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    checkExpirations: function() {
        const now = new Date();
        let shouldReload = false;

        this.activeLoans.forEach(l => {
            if(!l._alerted) {
                const endTime = new Date(l.end_time);
                if (now >= endTime) {
                    l._alerted = true; // prevent re-alerting continuously until returned
                    // Alert logic
                    alert(`¡ALERTA DE TIEMPO!\nEl tiempo de uso para el equipo: ${l.equipment_name} (Usuario: ${l.customer_name}) ha finalizado.`);
                }
            }
        });
    },

    returnEquipment: async function(loanId) {
        if(!confirm('¿Confirmar devolución del equipo?')) return;
        try {
            const res = await fetch('api/equipment.php?action=return_equipment', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ loan_id: loanId })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Equipo devuelto con éxito');
                this.loadData();
            } else throw new Error(data.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    },

    toggleStatus: async function(equipmentId, newStatus) {
        if(!confirm(`¿Seguro que deseas marcar este equipo como ${newStatus === 'maintenance' ? 'en mantenimiento' : 'disponible'}?`)) return;

        try {
            const res = await fetch('api/equipment.php?action=toggle_status', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ equipment_id: equipmentId, status: newStatus })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert(`Estado actualizado correctamente a ${newStatus}`);
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
                <input type="text" id="eqName" class="form-control" placeholder="Ej: Monitor B" required>
            </div>
            <div class="form-group">
                <label class="form-label">Descripción o Notas</label>
                <input type="text" id="eqDesc" class="form-control" placeholder="Ubicación o especificaciones">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar Equipo</button>
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
            app.showAlert('Nuevo equipo registrado con éxito');
            app.closeModal();
            Equipment.loadData();
        } else throw new Error(data.error);
    } catch(e) {
        app.showAlert(e.message, 'error');
    }
};

app.showLoanModal = function() {
    if(!window._availableEquipments || window._availableEquipments.length === 0) {
        app.showAlert('No hay equipos disponibles', 'warning'); return;
    }

    const html = `
        <form onsubmit="event.preventDefault(); window.Equipment_createLoan()">
            <div class="form-group">
                <label class="form-label">Equipo</label>
                <select id="loanEq" class="form-control" required>
                    <option value="">-- Seleccionar --</option>
                    ${window._availableEquipments.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Nombre del Cliente / Usuario</label>
                <input type="text" id="loanName" class="form-control" required>
            </div>
            <div class="form-group">
                <label class="form-label">Tiempo (Minutos)</label>
                <input type="number" id="loanMins" class="form-control" value="60" min="1" required>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Iniciar y Cronometrar</button>
            </div>
        </form>
    `;
    app.showModal('Registrar Uso de Equipo', html);
};

window.Equipment_createLoan = async function() {
    const payload = {
        equipment_id: parseInt(document.getElementById('loanEq').value, 10),
        customer_name: document.getElementById('loanName').value,
        duration_minutes: parseInt(document.getElementById('loanMins').value, 10)
    };

    try {
        const res = await fetch('api/equipment.php?action=start_loan', {
            method: 'POST',
            headers:{ 'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            app.showAlert('Préstamo iniciado');
            app.closeModal();
            Equipment.loadData();
        } else throw new Error(data.error);
    } catch(e) {
        app.showAlert(e.message, 'error');
    }
};
