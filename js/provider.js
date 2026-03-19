// js/provider.js
const Provider = {
    orders: [],
    lowStockProducts: [],
    allProducts: [],
    providers: [],

    init: async function() {
        // removed the role check here since admin and provider can both use it
        await this.loadLowStock();
        await this.loadOrders();
        await this.loadProviders();
        await this.loadAllProducts();
    },

    loadProviders: async function() {
        if(app.user.role !== 'admin') return;
        try {
            const res = await fetch('api/providers.php?action=list_providers');
            const data = await res.json();
            this.providers = data.providers || [];
        } catch(e) {
            console.error(e);
        }
    },

    loadAllProducts: async function() {
        try {
            const res = await fetch('api/providers.php?action=list_products');
            const data = await res.json();
            this.allProducts = data.products || [];
        } catch(e) {
            console.error(e);
        }
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
        providerHtml = `
            <div class="form-group" id="adminProviderSection">
                <label class="form-label">Seleccionar Proveedor</label>
                <select id="orderProviderId" class="form-control" required>
                    <option value="">-- Seleccionar proveedor --</option>
                    ${Provider.providers.map(p => `<option value="${p.id}">${p.username}</option>`).join('')}
                </select>
                <div class="text-muted mt-1" style="font-size: 0.75rem;">Como administrador, debes seleccionar a qué proveedor dirigir el pedido.</div>
            </div>
        `;
    }

    const html = `
        <form onsubmit="event.preventDefault(); window.Provider_createOrder()">
            ${providerHtml}
            
            <div id="orderProductsContainer">
                <div class="product-row mb-3" style="display: flex; gap: 10px; align-items: flex-end;">
                    <div style="flex: 2;">
                        <label class="form-label">Producto</label>
                        <select class="form-control order-prod" required>
                            <option value="">-- Seleccionar producto --</option>
                            ${Provider.allProducts.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.stock})</option>`).join('')}
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label class="form-label">Cantidad</label>
                        <input type="number" class="form-control order-qty" min="1" value="10" required>
                    </div>
                    <div style="width: 40px;">
                        <!-- First row cannot be removed -->
                    </div>
                </div>
            </div>
            
            <button type="button" class="btn btn-secondary btn-sm mb-3" onclick="window.Provider_addProductRow()">
                + Agregar otro producto
            </button>

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

window.Provider_addProductRow = function() {
    const container = document.getElementById('orderProductsContainer');
    const div = document.createElement('div');
    div.className = 'product-row mb-3';
    div.style = 'display: flex; gap: 10px; align-items: flex-end;';
    
    div.innerHTML = `
        <div style="flex: 2;">
            <select class="form-control order-prod" required>
                <option value="">-- Seleccionar producto --</option>
                ${Provider.allProducts.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.stock})</option>`).join('')}
            </select>
        </div>
        <div style="flex: 1;">
            <input type="number" class="form-control order-qty" min="1" value="10" required>
        </div>
        <div style="width: 40px;">
            <button type="button" class="btn btn-danger btn-sm" onclick="window.Provider_removeProductRow(this)">×</button>
        </div>
    `;
    container.appendChild(div);
};

window.Provider_removeProductRow = function(btn) {
    btn.closest('.product-row').remove();
};

window.Provider_createOrder = async function() {
    const productSelects = document.querySelectorAll('.order-prod');
    const quantityInputs = document.querySelectorAll('.order-qty');
    const notes = document.getElementById('orderNotes').value;
    
    const items = [];
    for(let i = 0; i < productSelects.length; i++) {
        const prodId = parseInt(productSelects[i].value, 10);
        const qty = parseInt(quantityInputs[i].value, 10);
        if(prodId && qty > 0) {
            items.push({ product_id: prodId, quantity: qty });
        }
    }

    if(items.length === 0) {
        app.showAlert('Debes seleccionar al menos un producto', 'error');
        return;
    }
    
    // Admin specific handling for provider_id
    const providerSelect = document.getElementById('orderProviderId');
    const providerId = providerSelect && providerSelect.value ? parseInt(providerSelect.value, 10) : null;

    const payload = {
        items: items,
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
