// js/provider.js
const Providers = {
    suppliers: [],
    orders: [],
    lowStockProducts: [],
    allProducts: [],

    init: async function() {
        await Promise.all([
            this.loadSuppliers(),
            this.loadOrders(),
            this.loadLowStock(),
            this.loadAllProducts()
        ]);
    },

    switchTab: function(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(`tab-${tabName}`)?.classList.add('active');
        
        if (tabName === 'directory') {
            this.renderSuppliers();
        }
    },

    renderSuppliers: function() {
        const grid = document.getElementById('suppliersGrid');
        if (!grid) return;

        if (this.suppliers.length === 0) {
            grid.innerHTML = '<div class="text-center text-muted">No hay proveedores registrados</div>';
            return;
        }

        grid.innerHTML = this.suppliers.map(s => `
            <div class="supplier-card">
                <div class="supplier-header">
                    <div>
                        <div class="supplier-name">${s.name}</div>
                        ${s.company_name ? `<div class="supplier-company">${s.company_name}</div>` : ''}
                    </div>
                    <span class="badge badge-primary">${s.payment_terms || 'Contado'}</span>
                </div>
                <div class="supplier-contact">
                    ${s.contact_name ? `<p><strong>${s.contact_name}</strong></p>` : ''}
                    ${s.email ? `<p>${s.email}</p>` : ''}
                    ${s.phone ? `<p>${s.phone}</p>` : ''}
                    ${s.mobile ? `<p>${s.mobile}</p>` : ''}
                    ${s.city || s.state ? `<p>${[s.city, s.state].filter(Boolean).join(', ')}</p>` : ''}
                </div>
                <div class="supplier-actions">
                    <button class="btn btn-primary btn-sm" onclick="Providers.showSupplierModal(Providers.suppliers.find(x => x.id === ${s.id}))">Editar</button>
                    ${app.user.role === 'admin' ? `<button class="btn btn-danger btn-sm" onclick="Providers.deleteSupplier(${s.id})">Eliminar</button>` : ''}
                </div>
            </div>
        `).join('');
    },

    loadSuppliers: async function() {
        try {
            const res = await fetch('api/providers.php?action=list_suppliers');
            const data = await res.json();
            this.suppliers = data.suppliers || [];
        } catch(e) {
            console.error('Error loading suppliers:', e);
        }
    },

    loadAllProducts: async function() {
        try {
            const res = await fetch('api/providers.php?action=list_products');
            const data = await res.json();
            this.allProducts = data.products || [];
        } catch(e) {
            console.error('Error loading products:', e);
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
            console.error('Error loading low stock:', e);
        }
    },

    renderLowStock: function() {
        const section = document.getElementById('lowStockSection');
        const tbody = document.getElementById('lowStockTable2');
        
        if(!tbody) return;
        
        if(this.lowStockProducts.length > 0) {
            section?.classList.remove('hidden');
            tbody.innerHTML = this.lowStockProducts.map(p => `
                <tr>
                    <td>${p.sku || '-'}</td>
                    <td style="font-weight: 500;">${p.name}</td>
                    <td><span class="badge badge-danger">${p.stock}</span></td>
                    <td><span class="text-muted">${p.min_stock}</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay productos con stock bajo</td></tr>';
        }
    },

    loadOrders: async function() {
        const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
        try {
            const url = statusFilter 
                ? `api/providers.php?action=list_orders&status=${statusFilter}`
                : 'api/providers.php?action=list_orders';
            const res = await fetch(url);
            const data = await res.json();
            this.orders = data.orders || [];
            this.renderOrders();
        } catch(e) {
            app.showAlert('Error cargando pedidos', 'error');
        }
    },

    renderOrders: function() {
        const tbody = document.getElementById('ordersTable');
        if(!tbody) return;

        if (this.orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay pedidos registrados</td></tr>';
            return;
        }

        const statusLabels = {
            'draft': { text: 'Borrador', class: 'badge-secondary' },
            'pending': { text: 'Pendiente', class: 'badge-warning' },
            'sent': { text: 'Enviado', class: 'badge-info' },
            'confirmed': { text: 'Confirmado', class: 'badge-primary' },
            'in_transit': { text: 'En Camino', class: 'badge-info' },
            'received': { text: 'Recibido', class: 'badge-success' },
            'partial': { text: 'Parcial', class: 'badge-warning' },
            'completed': { text: 'Completado', class: 'badge-success' },
            'cancelled': { text: 'Cancelado', class: 'badge-danger' }
        };

        tbody.innerHTML = this.orders.map(o => {
            const status = statusLabels[o.status] || { text: o.status, class: 'badge-secondary' };
            
            let actions = '';
            if (app.user.role === 'admin') {
                if (o.status === 'draft') {
                    actions = `<button class="btn btn-primary btn-sm" onclick="Providers.sendOrder(${o.id})">Enviar a Proveedor</button>`;
                } else if (o.status === 'pending' || o.status === 'confirmed' || o.status === 'in_transit') {
                    actions = `<button class="btn btn-success btn-sm" onclick="Providers.receiveOrder(${o.id})">Recibir</button>`;
                }
                actions += ` <button class="btn btn-danger btn-sm" onclick="Providers.cancelOrder(${o.id})">Cancelar</button>`;
                actions += ` <button class="btn btn-secondary btn-sm" onclick="Providers.viewOrder(${o.id})">Ver</button>`;
            }

            return `
                <tr>
                    <td><strong>${o.order_number}</strong></td>
                    <td>${o.supplier_name}</td>
                    <td>${new Date(o.order_date).toLocaleDateString()}</td>
                    <td><strong>$${parseFloat(o.total_amount || 0).toFixed(2)}</strong></td>
                    <td><span class="badge ${status.class}">${status.text}</span></td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    },

    showOrderModal: function() {
        const html = `
            <form onsubmit="event.preventDefault(); Providers.createOrder()">
                <div class="form-group">
                    <label class="form-label">Proveedor *</label>
                    <select id="orderSupplierId" class="form-control" required onchange="Providers.updateSupplierProducts()">
                        <option value="">-- Seleccionar proveedor --</option>
                        ${this.suppliers.map(s => `<option value="${s.id}">${s.name} ${s.company_name ? '(' + s.company_name + ')' : ''}</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Fecha Esperada</label>
                    <input type="date" id="orderExpectedDate" class="form-control">
                </div>

                <div class="form-group">
                    <label class="form-label">Productos</label>
                    <div id="orderProductsContainer">
                        <div class="product-row mb-3" style="display: flex; gap: 10px; align-items: flex-end;">
                            <div style="flex: 2;">
                                <select class="form-control order-prod" required onchange="Providers.updateProductPrice(this)">
                                    <option value="">-- Seleccionar producto --</option>
                                    ${this.allProducts.map(p => `<option value="${p.id}" data-price="${p.price || 0}">${p.name} (Stock: ${p.stock})</option>`).join('')}
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label class="form-label" style="font-size: 0.75rem;">Cantidad</label>
                                <input type="number" class="form-control order-qty" min="1" value="1" required>
                            </div>
                            <div style="width: 40px;"></div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="Providers.addProductRow()">+ Agregar Producto</button>
                </div>

                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea id="orderNotes" class="form-control" rows="2" placeholder="Observaciones del pedido..."></textarea>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Crear Pedido</button>
                </div>
            </form>
        `;
        app.showModal('Nuevo Pedido a Proveedor', html);
    },

    addProductRow: function() {
        const container = document.getElementById('orderProductsContainer');
        const div = document.createElement('div');
        div.className = 'product-row mb-3';
        div.style = 'display: flex; gap: 10px; align-items: flex-end;';
        
        div.innerHTML = `
            <div style="flex: 2;">
                <select class="form-control order-prod" required onchange="Providers.updateProductPrice(this)">
                    <option value="">-- Seleccionar producto --</option>
                    ${this.allProducts.map(p => `<option value="${p.id}" data-price="${p.price || 0}">${p.name} (Stock: ${p.stock})</option>`).join('')}
                </select>
            </div>
            <div style="flex: 1;">
                <input type="number" class="form-control order-qty" min="1" value="1" required>
            </div>
            <div style="width: 40px;">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.product-row').remove()">×</button>
            </div>
        `;
        container.appendChild(div);
    },

    updateProductPrice: function(select) {
        // Future: could auto-fill cost price from supplier_products
    },

    createOrder: async function() {
        const supplierId = document.getElementById('orderSupplierId').value;
        const expectedDate = document.getElementById('orderExpectedDate').value;
        const notes = document.getElementById('orderNotes').value;
        
        const productSelects = document.querySelectorAll('.order-prod');
        const quantityInputs = document.querySelectorAll('.order-qty');
        
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

        try {
            const res = await fetch('api/providers.php?action=create_order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplier_id: supplierId, items, expected_date: expectedDate, notes })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert(`Pedido ${data.order_number} creado exitosamente`);
                app.closeModal();
                this.loadOrders();
            } else {
                throw new Error(data.error);
            }
        } catch(e) {
            app.showAlert(e.message || 'Error creando pedido', 'error');
        }
    },

    sendOrder: async function(orderId) {
        if(!confirm('¿Marcar este pedido como enviado al proveedor?')) return;
        try {
            const res = await fetch('api/providers.php?action=update_order_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, status: 'pending' })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Pedido enviado');
                this.loadOrders();
            } else throw new Error(data.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    },

    receiveOrder: async function(orderId) {
        if(!confirm('¿Confirmar recepción del pedido? Se actualizará el stock.')) return;
        try {
            const res = await fetch('api/providers.php?action=update_order_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, status: 'completed' })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Pedido recibido y stock actualizado');
                this.loadOrders();
                if(typeof Inventory !== 'undefined') Inventory.loadProducts();
            } else throw new Error(data.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    },

    cancelOrder: async function(orderId) {
        if(!confirm('¿Cancelar este pedido?')) return;
        try {
            const res = await fetch('api/providers.php?action=update_order_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    viewOrder: async function(orderId) {
        try {
            const res = await fetch(`api/providers.php?action=get_order&id=${orderId}`);
            const data = await res.json();
            if(data.order) {
                this.showOrderDetail(data.order);
            }
        } catch(e) {
            app.showAlert('Error cargando detalles', 'error');
        }
    },

    showOrderDetail: function(order) {
        const itemsHtml = order.items.map(item => `
            <tr>
                <td>${item.sku || '-'}</td>
                <td>${item.product_name}</td>
                <td>${item.quantity_ordered}</td>
                <td>${item.quantity_received || 0}</td>
                <td>$${parseFloat(item.unit_price).toFixed(2)}</td>
                <td>$${parseFloat(item.subtotal).toFixed(2)}</td>
            </tr>
        `).join('');

        const html = `
            <div style="margin-bottom: 1rem;">
                <p><strong>Orden:</strong> ${order.order_number}</p>
                <p><strong>Proveedor:</strong> ${order.supplier_name}</p>
                <p><strong>Fecha:</strong> ${new Date(order.order_date).toLocaleDateString()}</p>
                <p><strong>Total:</strong> $${parseFloat(order.total_amount).toFixed(2)}</p>
                ${order.notes ? `<p><strong>Notas:</strong> ${order.notes}</p>` : ''}
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Producto</th>
                            <th>Cant. Pedida</th>
                            <th>Cant. Recibida</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" onclick="app.closeModal()">Cerrar</button>
            </div>
        `;
        app.showModal('Detalle del Pedido', html);
    },

    showSupplierModal: function(supplier = null) {
        const isEdit = !!supplier;
        const html = `
            <form onsubmit="event.preventDefault(); Providers.saveSupplier(${isEdit ? supplier.id : 'null'})">
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" id="supName" class="form-control" value="${supplier?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Empresa</label>
                    <input type="text" id="supCompany" class="form-control" value="${supplier?.company_name || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">RFC / Tax ID</label>
                    <input type="text" id="supRfc" class="form-control" value="${supplier?.rfc_tax_id || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Contacto</label>
                    <input type="text" id="supContact" class="form-control" value="${supplier?.contact_name || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="supEmail" class="form-control" value="${supplier?.email || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Teléfono</label>
                    <input type="text" id="supPhone" class="form-control" value="${supplier?.phone || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Dirección</label>
                    <textarea id="supAddress" class="form-control" rows="2">${supplier?.address || ''}</textarea>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">Ciudad</label>
                        <input type="text" id="supCity" class="form-control" value="${supplier?.city || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <input type="text" id="supState" class="form-control" value="${supplier?.state || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Términos de Pago</label>
                    <select id="supPaymentTerms" class="form-control">
                        <option value="contado" ${supplier?.payment_terms === 'contado' ? 'selected' : ''}>Contado</option>
                        <option value="15 días" ${supplier?.payment_terms === '15 días' ? 'selected' : ''}>15 días</option>
                        <option value="30 días" ${supplier?.payment_terms === '30 días' ? 'selected' : ''}>30 días</option>
                        <option value="60 días" ${supplier?.payment_terms === '60 días' ? 'selected' : ''}>60 días</option>
                    </select>
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
            id,
            name: document.getElementById('supName').value,
            company_name: document.getElementById('supCompany').value,
            rfc_tax_id: document.getElementById('supRfc').value,
            contact_name: document.getElementById('supContact').value,
            email: document.getElementById('supEmail').value,
            phone: document.getElementById('supPhone').value,
            address: document.getElementById('supAddress').value,
            city: document.getElementById('supCity').value,
            state: document.getElementById('supState').value,
            payment_terms: document.getElementById('supPaymentTerms').value
        };

        try {
            const res = await fetch('api/providers.php?action=save_supplier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if(result.success) {
                app.showAlert(id ? 'Proveedor actualizado' : 'Proveedor creado');
                app.closeModal();
                this.loadSuppliers();
            } else throw new Error(result.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    },

    deleteSupplier: async function(id) {
        if(!confirm('¿Eliminar este proveedor?')) return;
        try {
            const res = await fetch('api/providers.php?action=delete_supplier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Proveedor eliminado');
                this.loadSuppliers();
            } else throw new Error(data.error);
        } catch(e) {
            app.showAlert(e.message, 'error');
        }
    }
};
