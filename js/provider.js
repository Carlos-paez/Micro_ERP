// js/provider.js - Enhanced Provider Management Module
const Providers = {
    suppliers: [],
    orders: [],
    products: [],
    lowStockProducts: [],

    init: async function() {
        await this.loadSuppliers();
        await this.loadOrders();
        await this.loadLowStock();
    },

    switchTab: function(tabId) {
        document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');
        
        if (tabId === 'suppliers') this.loadSuppliers();
        if (tabId === 'orders') this.loadOrders();
        if (tabId === 'lowstock') this.loadLowStock();
    },

    loadSuppliers: async function() {
        try {
            const res = await fetch('api/providers.php?action=list_suppliers');
            const data = await res.json();
            this.suppliers = data.suppliers || [];
            this.renderSuppliers();
        } catch (e) {
            app.showAlert('Error cargando proveedores', 'error');
        }
    },

    renderSuppliers: function() {
        const tbody = document.getElementById('suppliersTable');
        if (!tbody) return;

        if (this.suppliers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay proveedores registrados</td></tr>';
            return;
        }

        tbody.innerHTML = this.suppliers.map(s => `
            <tr>
                <td style="font-weight: 500;">${s.name}</td>
                <td class="text-muted">${s.company_name || '-'}</td>
                <td>${s.contact_name || '-'}</td>
                <td>${s.phone || '-'}</td>
                <td><span class="badge badge-primary">${s.total_orders || 0}</span></td>
                <td class="text-success">$${parseFloat(s.total_purchases || 0).toFixed(2)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="Providers.showSupplierModal(${s.id})">✏️</button>
                        <button class="btn btn-secondary btn-sm" onclick="Providers.viewSupplier(${s.id})">👁️</button>
                        <button class="btn btn-danger btn-sm" onclick="Providers.deleteSupplier(${s.id})">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    showSupplierModal: function(supplierId = null) {
        const supplier = supplierId ? this.suppliers.find(s => s.id === supplierId) : null;
        const isEdit = supplier !== null;

        const html = `
            <form onsubmit="event.preventDefault(); Providers.saveSupplier(${isEdit ? supplierId : 'null'})">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre *</label>
                        <input type="text" id="supName" class="form-control" value="${isEdit ? supplier.name : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Empresa</label>
                        <input type="text" id="supCompany" class="form-control" value="${isEdit ? supplier.company_name || '' : ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">RFC/Tax ID</label>
                        <input type="text" id="supRfc" class="form-control" value="${isEdit ? supplier.rfc_tax_id || '' : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contacto</label>
                        <input type="text" id="supContact" class="form-control" value="${isEdit ? supplier.contact_name || '' : ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="supEmail" class="form-control" value="${isEdit ? supplier.email || '' : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Teléfono</label>
                        <input type="text" id="supPhone" class="form-control" value="${isEdit ? supplier.phone || '' : ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Dirección</label>
                    <input type="text" id="supAddress" class="form-control" value="${isEdit ? supplier.address || '' : ''}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Ciudad</label>
                        <input type="text" id="supCity" class="form-control" value="${isEdit ? supplier.city || '' : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <input type="text" id="supState" class="form-control" value="${isEdit ? supplier.state || '' : ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Términos de Pago</label>
                    <select id="supPayment" class="form-control">
                        <option value="contado" ${isEdit && supplier.payment_terms === 'contado' ? 'selected' : ''}>Contado</option>
                        <option value="15 días" ${isEdit && supplier.payment_terms === '15 días' ? 'selected' : ''}>15 días</option>
                        <option value="30 días" ${isEdit && supplier.payment_terms === '30 días' ? 'selected' : ''}>30 días</option>
                        <option value="60 días" ${isEdit && supplier.payment_terms === '60 días' ? 'selected' : ''}>60 días</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea id="supNotes" class="form-control" rows="2">${isEdit ? supplier.notes || '' : ''}</textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                </div>
            </form>
        `;
        app.showModal(isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor', html);
    },

    saveSupplier: async function(id) {
        const data = {
            name: document.getElementById('supName').value,
            company_name: document.getElementById('supCompany').value,
            rfc_tax_id: document.getElementById('supRfc').value,
            contact_name: document.getElementById('supContact').value,
            email: document.getElementById('supEmail').value,
            phone: document.getElementById('supPhone').value,
            address: document.getElementById('supAddress').value,
            city: document.getElementById('supCity').value,
            state: document.getElementById('supState').value,
            payment_terms: document.getElementById('supPayment').value,
            notes: document.getElementById('supNotes').value
        };

        try {
            const action = id ? 'update_supplier' : 'create_supplier';
            if (id) data.id = id;

            const res = await fetch(`api/providers.php?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                app.showAlert(result.message);
                app.closeModal();
                this.loadSuppliers();
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    viewSupplier: async function(supplierId) {
        try {
            const res = await fetch(`api/providers.php?action=get_supplier&id=${supplierId}`);
            const data = await res.json();
            const s = data.supplier;
            
            const html = `
                <div class="supplier-detail">
                    <div class="detail-row">
                        <span class="detail-label">Empresa:</span>
                        <span>${s.company_name || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">RFC:</span>
                        <span>${s.rfc_tax_id || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Contacto:</span>
                        <span>${s.contact_name || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span>${s.email || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Teléfono:</span>
                        <span>${s.phone || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Dirección:</span>
                        <span>${s.address || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Ciudad:</span>
                        <span>${s.city || '-'}, ${s.state || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Términos:</span>
                        <span>${s.payment_terms || '-'}</span>
                    </div>
                    ${s.notes ? `<div class="detail-row"><span class="detail-label">Notas:</span><span>${s.notes}</span></div>` : ''}
                </div>
                ${s.products && s.products.length > 0 ? `
                    <h4 style="margin-top: 1rem;">Productos del Proveedor</h4>
                    <div class="table-container" style="max-height: 200px; overflow-y: auto;">
                        <table class="table">
                            <thead><tr><th>Producto</th><th>SKU</th><th>Precio</th></tr></thead>
                            <tbody>
                                ${s.products.map(p => `
                                    <tr>
                                        <td>${p.product_name}</td>
                                        <td>${p.supplier_sku || '-'}</td>
                                        <td class="text-success">$${parseFloat(p.supplier_price).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" onclick="Providers.showOrderModal(${supplierId})">Crear Orden</button>
                    <button type="button" class="btn" onclick="app.closeModal()">Cerrar</button>
                </div>
            `;
            app.showModal(`Proveedor: ${s.name}`, html);
        } catch (e) {
            app.showAlert('Error cargando proveedor', 'error');
        }
    },

    deleteSupplier: async function(supplierId) {
        if (!confirm('¿Eliminar este proveedor?')) return;
        
        try {
            const res = await fetch('api/providers.php?action=delete_supplier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: supplierId })
            });
            const data = await res.json();
            if (data.success) {
                app.showAlert('Proveedor eliminado');
                this.loadSuppliers();
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    loadOrders: async function() {
        const status = document.getElementById('orderStatusFilter')?.value || '';
        
        try {
            const url = `api/providers.php?action=list_orders${status ? '&status=' + status : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            this.orders = data.orders || [];
            this.renderOrders();
        } catch (e) {
            app.showAlert('Error cargando pedidos', 'error');
        }
    },

    renderOrders: function() {
        const tbody = document.getElementById('ordersTable');
        if (!tbody) return;

        if (this.orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay pedidos</td></tr>';
            return;
        }

        const statusLabels = {
            'draft': ['badge-secondary', 'Borrador'],
            'pending': ['badge-warning', 'Pendiente'],
            'sent': ['badge-info', 'Enviado'],
            'confirmed': ['badge-primary', 'Confirmado'],
            'in_transit': ['badge-info', 'En Tránsito'],
            'received': ['badge-success', 'Recibido'],
            'partial': ['badge-warning', 'Parcial'],
            'completed': ['badge-success', 'Completado'],
            'cancelled': ['badge-danger', 'Cancelado']
        };

        tbody.innerHTML = this.orders.map(o => {
            const [className, label] = statusLabels[o.status] || ['badge-secondary', o.status];
            
            return `
                <tr>
                    <td><strong>#${o.order_number || o.id}</strong></td>
                    <td>${o.supplier_name}</td>
                    <td class="text-muted">${new Date(o.created_at).toLocaleDateString()}</td>
                    <td class="text-success">$${parseFloat(o.total_amount || 0).toFixed(2)}</td>
                    <td><span class="badge ${className}">${label}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="Providers.viewOrder(${o.id})">Ver</button>
                        ${o.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="Providers.updateOrderStatus(${o.id}, 'sent')">Enviar</button>` : ''}
                        ${['sent', 'confirmed', 'in_transit'].includes(o.status) ? `<button class="btn btn-success btn-sm" onclick="Providers.updateOrderStatus(${o.id}, 'received')">Recibir</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },

    showOrderModal: function(supplierId = null) {
        if (this.suppliers.length === 0) {
            app.showAlert('Primero registra un proveedor', 'warning');
            return;
        }

        const html = `
            <form onsubmit="event.preventDefault(); Providers.createOrder()">
                <div class="form-group">
                    <label class="form-label">Proveedor *</label>
                    <select id="orderSupplier" class="form-control" required ${supplierId ? 'disabled' : ''}>
                        <option value="">-- Seleccionar --</option>
                        ${this.suppliers.map(s => `<option value="${s.id}" ${s.id == supplierId ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                    ${supplierId ? '<input type="hidden" id="orderSupplier" value="' + supplierId + '">' : ''}
                </div>
                
                <div class="form-group">
                    <label class="form-label">Fecha Esperada</label>
                    <input type="date" id="orderExpected" class="form-control">
                </div>
                
                <div id="orderItems">
                    <label class="form-label">Productos</label>
                    ${this.renderOrderItemRow()}
                </div>
                
                <button type="button" class="btn btn-secondary btn-sm" onclick="Providers.addOrderItem()">+ Agregar Producto</button>
                
                <div class="form-group" style="margin-top: 1rem;">
                    <label class="form-label">Notas</label>
                    <textarea id="orderNotes" class="form-control" rows="2"></textarea>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Crear Orden</button>
                </div>
            </form>
        `;
        app.showModal('Nueva Orden de Compra', html);
    },

    renderOrderItemRow: function() {
        return `
            <div class="order-item-row" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;">
                <select class="form-control order-product" style="flex: 2;" onchange="Providers.updateOrderTotal()">
                    <option value="">-- Producto --</option>
                </select>
                <input type="number" class="form-control order-qty" style="flex: 1;" placeholder="Cantidad" min="1" value="1" oninput="Providers.updateOrderTotal()">
                <input type="number" class="form-control order-price" style="flex: 1;" placeholder="Precio" step="0.01" oninput="Providers.updateOrderTotal()">
                <span class="order-subtotal" style="flex: 1;">$0.00</span>
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove(); Providers.updateOrderTotal();">×</button>
            </div>
        `;
    },

    addOrderItem: function() {
        const container = document.getElementById('orderItems');
        const div = document.createElement('div');
        div.innerHTML = this.renderOrderItemRow();
        container.appendChild(div.firstElementChild);
    },

    updateOrderTotal: function() {
        const rows = document.querySelectorAll('.order-item-row');
        rows.forEach(row => {
            const qty = parseInt(row.querySelector('.order-qty').value) || 0;
            const price = parseFloat(row.querySelector('.order-price').value) || 0;
            const subtotal = qty * price;
            row.querySelector('.order-subtotal').textContent = '$' + subtotal.toFixed(2);
        });
    },

    createOrder: async function() {
        const supplierId = parseInt(document.getElementById('orderSupplier').value);
        const expectedDate = document.getElementById('orderExpected').value;
        const notes = document.getElementById('orderNotes').value;
        
        const rows = document.querySelectorAll('.order-item-row');
        const items = [];
        
        rows.forEach(row => {
            const productSelect = row.querySelector('.order-product');
            const qty = parseInt(row.querySelector('.order-qty').value) || 0;
            const price = parseFloat(row.querySelector('.order-price').value) || 0;
            
            if (productSelect.value && qty > 0) {
                items.push({ product_id: parseInt(productSelect.value), quantity: qty, price: price });
            }
        });
        
        if (items.length === 0) {
            app.showAlert('Agrega al menos un producto', 'error');
            return;
        }
        
        try {
            const res = await fetch('api/providers.php?action=create_order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplier_id: supplierId, items: items, expected_date: expectedDate, notes: notes })
            });
            const data = await res.json();
            if (data.success) {
                app.showAlert(`Orden creada: ${data.order_number}`);
                app.closeModal();
                this.loadOrders();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    viewOrder: async function(orderId) {
        try {
            const res = await fetch(`api/providers.php?action=get_order&id=${orderId}`);
            const data = await res.json();
            const order = data.order;
            
            const html = `
                <div class="order-detail">
                    <div class="detail-row">
                        <span class="detail-label">Orden:</span>
                        <span><strong>#${order.order_number}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Proveedor:</span>
                        <span>${order.supplier_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Fecha:</span>
                        <span>${new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total:</span>
                        <span class="text-success">$${parseFloat(order.total_amount || 0).toFixed(2)}</span>
                    </div>
                </div>
                
                <h4 style="margin-top: 1rem;">Productos</h4>
                <div class="table-container">
                    <table class="table">
                        <thead><tr><th>Producto</th><th>Solicitado</th><th>Recibido</th><th>Precio</th><th>Subtotal</th></tr></thead>
                        <tbody>
                            ${order.items.map(i => `
                                <tr>
                                    <td>${i.product_name}</td>
                                    <td>${i.quantity_ordered}</td>
                                    <td>${i.quantity_received || 0}</td>
                                    <td>$${parseFloat(i.unit_price).toFixed(2)}</td>
                                    <td>$${parseFloat(i.subtotal).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                ${order.notes ? `<p style="margin-top: 1rem;"><strong>Notas:</strong> ${order.notes}</p>` : ''}
                
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cerrar</button>
                </div>
            `;
            app.showModal(`Orden #${order.order_number}`, html);
        } catch (e) {
            app.showAlert('Error cargando orden', 'error');
        }
    },

    updateOrderStatus: async function(orderId, newStatus) {
        if (!confirm('¿Actualizar estado del pedido?')) return;
        
        try {
            const res = await fetch('api/providers.php?action=update_order_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                app.showAlert(data.message);
                this.loadOrders();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    loadLowStock: async function() {
        try {
            const res = await fetch('api/providers.php?action=low_stock');
            const data = await res.json();
            this.lowStockProducts = data.products || [];
            this.renderLowStock();
        } catch (e) {
            console.error('Error:', e);
        }
    },

    renderLowStock: function() {
        const tbody = document.getElementById('lowStockProductsTable');
        if (!tbody) return;

        if (this.lowStockProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-success">✓ Inventario saludable</td></tr>';
            return;
        }

        tbody.innerHTML = this.lowStockProducts.map(p => `
            <tr>
                <td style="font-weight: 500;">${p.name}</td>
                <td><span class="badge badge-danger">${p.stock}</span></td>
                <td>${p.min_stock || 5}</td>
                <td>${p.category_name || '-'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="Providers.createOrderForProduct(${p.id})">Crear Orden</button>
                </td>
            </tr>
        `).join('');
    },

    createOrderForProduct: function(productId) {
        this.switchTab('orders');
        setTimeout(() => this.showOrderModal(), 100);
    }
};

window.Providers = Providers;
