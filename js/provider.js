// js/provider.js
const Provider = {
    orders: [],
    lowStockProducts: [],

    init: async function() {
        // removed the role check here since admin and provider can both use it
        await this.loadLowStock();
        await this.loadOrders();
    },

    loadLowStock: async function() {
        try {
            const res = await fetch('api/providers.php?action=low_stock');
            const data = await res.json();
            if(data.products) {
                this.lowStockProducts = data.products;
                this.renderLowStock();
            }
        } catch(e) {
            console.error(e);
        }
    },

    renderLowStock: function() {
        const section = document.getElementById('lowStockSection');
        const tbody = document.getElementById('lowStockTable');
        
        if(this.lowStockProducts.length > 0) {
            section.classList.remove('hidden');
            tbody.innerHTML = this.lowStockProducts.map(p => `
                <tr>
                    <td style="font-weight: 500;">${p.name}</td>
                    <td><span class="badge badge-danger">${p.stock}</span></td>
                </tr>
            `).join('');
        } else {
            section.classList.add('hidden');
        }
    },

    loadOrders: async function() {
        try {
            const res = await fetch('api/providers.php?action=list_orders');
            const data = await res.json();
            this.orders = data.orders || [];
            this.renderOrders();
        } catch(e) {
            app.showAlert('Error cargando pedidos', 'error');
        }
    },

    renderOrders: function() {
        const tbody = document.getElementById('providerOrdersTable');
        if(!tbody) return;

        if (this.orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay pedidos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = this.orders.map(o => {
            let statusClass = 'badge-warning';
            let statusText = 'Pendiente';
            
            if(o.status === 'fulfilled') {
                statusClass = 'badge-primary';
                statusText = 'En Camino (Preparado)';
            } else if(o.status === 'completed') {
                statusClass = 'badge-success';
                statusText = 'Recibido (Completado)';
            } else if(o.status === 'cancelled') {
                statusClass = 'badge-danger';
                statusText = 'Cancelado';
            }

            let actionHtml = '';
            
            // Workflow:
            // 1) Admin or Provider creates Order (status: pending)
            // 2) Provider prepares it and marks it "fulfilled" (status: fulfilled)
            // 3) Admin receives the physical items and marks it "completed" (status: completed -> updates stock)
            
            if(app.user.role === 'provider' && o.status === 'pending') {
                actionHtml = `
                    <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-right: 0.5rem;" onclick="Provider.fulfillOrder(${o.id})">Marcar Enviado</button>
                    <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem" onclick="Provider.cancelOrder(${o.id})">Cancelar</button>
                `;
            } else if(app.user.role === 'admin' && o.status === 'pending') {
                actionHtml = `<span class="text-muted" style="font-size: 0.75rem">Esperando envío del proveedor...</span>`;
                actionHtml += `<br><button class="btn btn-danger" style="margin-top: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem" onclick="Provider.cancelAdminOrder(${o.id})">Cancelar Pedido</button>`;
            } else if(app.user.role === 'admin' && o.status === 'fulfilled') {
                actionHtml = `<button class="btn btn-success" style="padding: 0.25rem 0.5rem; font-size: 0.75rem" onclick="Provider.receiveOrder(${o.id})">Recibir y Actualizar Stock</button>`;
            }

            const itemsList = o.items.map(i => `${i.quantity}x ${i.name}`).join('<br>');

            return `
                <tr>
                    <td>#${o.id}</td>
                    <td style="font-weight: 500;">${o.provider_name}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td class="text-muted text-sm">${new Date(o.created_at).toLocaleString()}</td>
                    <td style="font-size: 0.85rem">
                        <div class="mb-1">${itemsList}</div>
                        ${o.notes ? `<div class="text-muted"><em>Nota: ${o.notes}</em></div>` : ''}
                        <div class="mt-1">${actionHtml}</div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    receiveOrder: async function(orderId) {
        if(!confirm('¿Seguro que deseas marcar este pedido como recibido? Esto sumará el stock al inventario local.')) return;
        try {
            const res = await fetch('api/providers.php?action=update_order_status', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ order_id: orderId, status: 'completed' })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Pedido recibido y stock actualizado');
                this.loadOrders();
            } else throw new Error(data.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    },

    cancelAdminOrder: async function(orderId) {
        if(!confirm('¿Seguro que deseas cancelar este pedido?')) return;
        try {
            // Reusing update_order_status for admin
            const res = await fetch('api/providers.php?action=update_order_status', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ order_id: orderId, status: 'cancelled' })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Pedido cancelado');
                this.loadOrders();
            } else throw new Error(data.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    },

    fulfillOrder: async function(orderId) {
        // Provider marks it as sent
        if(!confirm('¿Confirmar que has preparado y enviado este pedido al local?')) return;
        try {
            const res = await fetch('api/providers.php?action=update_order_status_provider', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ order_id: orderId, status: 'fulfilled' })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Pedido marcado como enviado');
                this.loadOrders();
            } else throw new Error(data.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    },

    cancelOrder: async function(orderId) {
        if(!confirm('¿Seguro que deseas cancelar este pedido?')) return;
        try {
            const res = await fetch('api/providers.php?action=update_order_status_provider', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ order_id: orderId, status: 'cancelled' })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Pedido cancelado');
                this.loadOrders();
            } else throw new Error(data.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    }
};

app.showCreateOrderModal = function() {
    // Both Admin and Provider can do this
    let providerHtml = '';
    if (app.user.role === 'admin') {
        // If admin, they could specify the provider ID. For simplicity we default to 2 or let the backend assign it to admin ID and have providers see all?
        // Wait, provider_orders requires a provider_id. Let's add an input for provider ID if admin
        providerHtml = `
            <div class="form-group" id="adminProviderSection">
                <label class="form-label">ID del Proveedor Destino</label>
                <input type="number" id="orderProviderId" class="form-control" min="1" placeholder="Ej: 2 para el primer proveedor">
                <div class="text-muted mt-1" style="font-size: 0.75rem;">Si eres admin, debes especificar a qué proveedor dirigir el pedido.</div>
            </div>
        `;
    }

    const html = `
        <form onsubmit="event.preventDefault(); window.Provider_createOrder()">
            ${providerHtml}
            <div class="form-group">
                <label class="form-label">Producto a Pedir</label>
                <select id="orderProd" class="form-control" required>
                    <option value="">-- Seleccionar producto con bajo stock --</option>
                    ${Provider.lowStockProducts.map(p => `<option value="${p.id}">${p.name} (Stock Actual: ${p.stock})</option>`).join('')}
                </select>
                <div class="text-muted mt-1" style="font-size: 0.75rem;">Para efectos demostrativos, se pide 1 tipo de producto por orden.</div>
            </div>
            <div class="form-group">
                <label class="form-label">Cantidad Requerida</label>
                <input type="number" id="orderQty" class="form-control" min="1" value="10" required>
            </div>
            <div class="form-group">
                <label class="form-label">Notas</label>
                <input type="text" id="orderNotes" class="form-control" placeholder="Ej: Urgente, entrega matutina">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar Pedido</button>
            </div>
        </form>
    `;
    app.showModal('Nuevo Pedido de Proveedor', html);
};

window.Provider_createOrder = async function() {
    const prodId = parseInt(document.getElementById('orderProd').value, 10);
    const qty = parseInt(document.getElementById('orderQty').value, 10);
    const notes = document.getElementById('orderNotes').value;
    
    // Admin specific handling for provider_id
    const providerInput = document.getElementById('orderProviderId');
    const providerId = providerInput && providerInput.value ? parseInt(providerInput.value, 10) : null;

    const payload = {
        items: [{ product_id: prodId, quantity: qty }],
        notes: notes,
        provider_id: providerId
    };

    try {
        const res = await fetch('api/providers.php?action=create_order', {
            method: 'POST',
            headers:{ 'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            app.showAlert('Pedido registrado');
            app.closeModal();
            Provider.loadOrders();
        } else throw new Error(data.error);
    } catch(e) {
        app.showAlert(e.message, 'error');
    }
};
