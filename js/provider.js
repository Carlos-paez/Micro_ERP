// js/provider.js - Providers Module
const Providers = {
    suppliers: [],
    orders: [],
    allProducts: [],
    lowStockProducts: [],
    currentTab: 'orders',

    init: function() {
        this.loadSuppliers();
        this.loadOrders();
        this.loadLowStock();
    },

    switchTab: function(tabId) {
        this.currentTab = tabId;
        var tabs = document.querySelectorAll('#view-providers .tab');
        tabs.forEach(function(t) { t.classList.remove('active'); });
        var contents = document.querySelectorAll('#view-providers .tab-content');
        contents.forEach(function(c) { c.classList.remove('active'); });
        
        var activeTab = document.querySelector('#view-providers .tab[data-tab="' + tabId + '"]');
        if (activeTab) activeTab.classList.add('active');
        var activeContent = document.getElementById('tab-' + tabId);
        if (activeContent) activeContent.classList.add('active');
        
        if (tabId === 'directory') this.renderSuppliers();
        if (tabId === 'lowstock') this.renderLowStock();
    },

    loadSuppliers: function() {
        var self = this;
        fetch('api/providers.php?action=list_suppliers')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    console.error('Error suppliers:', data.error);
                    return;
                }
                self.suppliers = data.suppliers || [];
                if (self.currentTab === 'directory') self.renderSuppliers();
            })
            .catch(function(e) {
                console.error('Error loading suppliers:', e);
            });
    },

    loadOrders: function() {
        var self = this;
        var statusFilter = document.getElementById('orderStatusFilter');
        var status = statusFilter ? statusFilter.value : '';
        var url = status ? 'api/providers.php?action=list_orders&status=' + status : 'api/providers.php?action=list_orders';
        
        fetch(url)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    console.error('Error orders:', data.error);
                    app.showAlert('Error cargando pedidos', 'error');
                    return;
                }
                self.orders = data.orders || [];
                self.renderOrders();
            })
            .catch(function(e) {
                console.error('Error loading orders:', e);
                app.showAlert('Error de conexión', 'error');
            });
    },

    loadLowStock: function() {
        var self = this;
        fetch('api/providers.php?action=low_stock')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    console.error('Error low stock:', data.error);
                    return;
                }
                if (data.products) {
                    self.lowStockProducts = data.products;
                    if (self.currentTab === 'lowstock') self.renderLowStock();
                }
            })
            .catch(function(e) {
                console.error('Error loading low stock:', e);
            });
    },

    renderSuppliers: function() {
        var grid = document.getElementById('suppliersGrid');
        if (!grid) return;

        if (this.suppliers.length === 0) {
            grid.innerHTML = '<div class="empty-state">No hay proveedores registrados</div>';
            return;
        }

        var self = this;
        grid.innerHTML = this.suppliers.map(function(s) {
            var rating = s.rating || 0;
            var stars = '';
            for (var i = 0; i < 5; i++) {
                stars += '<span style="color: ' + (i < rating ? '#f59e0b' : '#64748b') + ';">★</span>';
            }
            return '<div class="supplier-card">' +
                '<div class="supplier-header">' +
                '<div>' +
                '<div class="supplier-name">' + self.escapeHtml(s.name) + '</div>' +
                '<div class="supplier-company">' + self.escapeHtml(s.company_name || '') + '</div>' +
                '<div style="margin-top:0.25rem;">' + stars + '</div>' +
                '</div>' +
                '<span class="badge badge-' + (s.payment_terms === 'contado' ? 'success' : 'warning') + '">' + (s.payment_terms || 'contado') + '</span>' +
                '</div>' +
                '<div class="supplier-contact">' +
                '<p>📧 ' + self.escapeHtml(s.email || 'Sin email') + '</p>' +
                '<p>📞 ' + self.escapeHtml(s.phone || 'Sin teléfono') + '</p>' +
                '<p>🏢 ' + self.escapeHtml(s.city || 'N/A') + ', ' + self.escapeHtml(s.state || '') + '</p>' +
                '<p>🏭 RFC: ' + self.escapeHtml(s.rfc_tax_id || 'N/A') + '</p>' +
                '</div>' +
                '<div class="supplier-actions">' +
                '<button class="btn btn-primary btn-sm" onclick="Providers.showOrderModal(' + s.id + ')">Nuevo Pedido</button>' +
                '<button class="btn btn-secondary btn-sm" onclick="Providers.viewSupplier(' + s.id + ')">Ver</button>' +
                '<button class="btn btn-warning btn-sm" onclick="Providers.editSupplier(' + s.id + ')">Editar</button>' +
                '</div></div>';
        }).join('');
    },

    escapeHtml: function(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    renderOrders: function() {
        var tbody = document.getElementById('ordersTable');
        if (!tbody) return;

        if (this.orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay pedidos</td></tr>';
            return;
        }

        var self = this;
        tbody.innerHTML = this.orders.map(function(o) {
            var statusClass = self.getStatusClass(o.status);
            var statusText = self.getStatusText(o.status);
            var actions = self.getOrderActions(o);
            var paymentBadge = o.payment_status === 'paid' ? '<span class="badge badge-success">Pagado</span>' : 
                              o.payment_status === 'partial' ? '<span class="badge badge-warning">Parcial</span>' : 
                              '<span class="badge badge-secondary">Pendiente</span>';
            
            return '<tr>' +
                '<td><strong>' + self.escapeHtml(o.order_number) + '</strong></td>' +
                '<td>' + self.escapeHtml(o.supplier_name || 'N/A') + '</td>' +
                '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
                '<td>' + paymentBadge + '</td>' +
                '<td>$' + parseFloat(o.total_amount || 0).toFixed(2) + '</td>' +
                '<td>' + new Date(o.created_at).toLocaleDateString() + '</td>' +
                '<td>' + actions + '</td></tr>';
        }).join('');
    },

    getStatusClass: function(status) {
        var classes = {
            'draft': 'badge-secondary',
            'pending': 'badge-warning',
            'confirmed': 'badge-info',
            'in_transit': 'badge-primary',
            'received': 'badge-success',
            'partial': 'badge-warning',
            'completed': 'badge-success',
            'cancelled': 'badge-danger'
        };
        return classes[status] || 'badge-secondary';
    },

    getStatusText: function(status) {
        var texts = {
            'draft': 'Borrador',
            'pending': 'Pendiente',
            'confirmed': 'Confirmado',
            'in_transit': 'En tránsito',
            'received': 'Recibido',
            'partial': 'Parcial',
            'completed': 'Completado',
            'cancelled': 'Cancelado'
        };
        return texts[status] || status;
    },

    getOrderActions: function(order) {
        var actions = '<button class="btn btn-secondary btn-sm" onclick="Providers.viewOrder(' + order.id + ')">Ver</button> ';
        
        if (order.status === 'draft') {
            actions = '<button class="btn btn-primary btn-sm" onclick="Providers.sendOrder(' + order.id + ')">Enviar</button> ' +
                      '<button class="btn btn-danger btn-sm" onclick="Providers.cancelOrder(' + order.id + ')">✕</button>';
        }
        if (order.status === 'pending') {
            actions += '<button class="btn btn-info btn-sm" onclick="Providers.confirmOrder(' + order.id + ')">Confirmar</button> ' +
                       '<button class="btn btn-danger btn-sm" onclick="Providers.cancelOrder(' + order.id + ')">✕</button>';
        }
        if (order.status === 'confirmed') {
            actions += '<button class="btn btn-primary btn-sm" onclick="Providers.markInTransit(' + order.id + ')">En Camino</button>';
        }
        if (order.status === 'in_transit') {
            actions += '<button class="btn btn-success btn-sm" onclick="Providers.receiveOrder(' + order.id + ')">Recibir</button>';
        }
        return actions;
    },

    renderLowStock: function() {
        var section = document.getElementById('lowStockSection');
        var tbody = document.getElementById('lowStockTable2');
        if (!tbody) return;

        var self = this;
        if (this.lowStockProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay productos con stock bajo</td></tr>';
            return;
        }

        tbody.innerHTML = this.lowStockProducts.map(function(p) {
            var urgency = p.stock === 0 ? 'badge-danger' : 'badge-warning';
            return '<tr>' +
                '<td><code>' + self.escapeHtml(p.sku || p.id) + '</code></td>' +
                '<td><strong>' + self.escapeHtml(p.name) + '</strong></td>' +
                '<td><span class="badge ' + urgency + '">' + p.stock + '</span></td>' +
                '<td>' + p.min_stock + '</td>' +
                '<td><button class="btn btn-primary btn-sm" onclick="Providers.createOrderFromLowStock(' + p.id + ')">Ordenar</button></td></tr>';
        }).join('');
    },

    showSupplierModal: function() {
        var html = '<form onsubmit="event.preventDefault(); Providers.saveSupplier()">' +
            '<div class="form-group"><label class="form-label">Nombre *</label>' +
            '<input type="text" id="supName" class="form-control" required></div>' +
            '<div class="form-group"><label class="form-label">Empresa</label>' +
            '<input type="text" id="supCompany" class="form-control"></div>' +
            '<div class="form-group"><label class="form-label">RFC/Tax ID</label>' +
            '<input type="text" id="supRfc" class="form-control"></div>' +
            '<div class="form-group"><label class="form-label">Persona de Contacto</label>' +
            '<input type="text" id="supContact" class="form-control"></div>' +
            '<div class="form-group"><label class="form-label">Email</label>' +
            '<input type="email" id="supEmail" class="form-control"></div>' +
            '<div class="form-group"><label class="form-label">Teléfono</label>' +
            '<input type="text" id="supPhone" class="form-control"></div>' +
            '<div class="form-group"><label class="form-label">Móvil</label>' +
            '<input type="text" id="supMobile" class="form-control"></div>' +
            '<div class="form-group"><label class="form-label">Dirección</label>' +
            '<textarea id="supAddress" class="form-control"></textarea></div>' +
            '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">Ciudad</label>' +
            '<input type="text" id="supCity" class="form-control"></div>' +
            '<div class="form-group" style="flex:1;"><label class="form-label">Estado</label>' +
            '<input type="text" id="supState" class="form-control"></div></div>' +
            '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">País</label>' +
            '<input type="text" id="supCountry" class="form-control" value="México"></div>' +
            '<div class="form-group" style="flex:1;"><label class="form-label">C.P.</label>' +
            '<input type="text" id="supPostal" class="form-control"></div></div>' +
            '<div class="form-group"><label class="form-label">Términos de Pago</label>' +
            '<select id="supPaymentTerms" class="form-control">' +
            '<option value="contado">Contado</option>' +
            '<option value="15 dias">15 días</option>' +
            '<option value="30 dias">30 días</option>' +
            '<option value="60 dias">60 días</option></select></div>' +
            '<div class="form-group"><label class="form-label">Notas</label>' +
            '<textarea id="supNotes" class="form-control"></textarea></div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">Guardar</button></div></form>';
        app.showModal('Agregar Proveedor', html);
    },

    viewSupplier: function(supplierId) {
        var supplier = this.suppliers.find(function(s) { return s.id === supplierId; });
        if (!supplier) return;

        var self = this;
        var html = '<div class="supplier-detail">' +
            '<h3>' + self.escapeHtml(supplier.name) + '</h3>' +
            '<p class="text-muted">' + self.escapeHtml(supplier.company_name || '') + '</p>' +
            '<hr style="border-color:#334155;margin:1rem 0;">' +
            '<p><strong>RFC:</strong> ' + self.escapeHtml(supplier.rfc_tax_id || 'N/A') + '</p>' +
            '<p><strong>Contacto:</strong> ' + self.escapeHtml(supplier.contact_name || 'N/A') + '</p>' +
            '<p><strong>Email:</strong> ' + self.escapeHtml(supplier.email || 'N/A') + '</p>' +
            '<p><strong>Teléfono:</strong> ' + self.escapeHtml(supplier.phone || 'N/A') + '</p>' +
            '<p><strong>Móvil:</strong> ' + self.escapeHtml(supplier.mobile || 'N/A') + '</p>' +
            '<p><strong>Dirección:</strong> ' + self.escapeHtml(supplier.address || 'N/A') + '</p>' +
            '<p><strong>Ubicación:</strong> ' + self.escapeHtml(supplier.city || '') + ', ' + self.escapeHtml(supplier.state || '') + ', ' + self.escapeHtml(supplier.country || '') + '</p>' +
            '<p><strong>C.P.:</strong> ' + self.escapeHtml(supplier.postal_code || 'N/A') + '</p>' +
            '<p><strong>Términos:</strong> ' + self.escapeHtml(supplier.payment_terms || 'contado') + '</p>' +
            (supplier.notes ? '<p><strong>Notas:</strong> ' + self.escapeHtml(supplier.notes) + '</p>' : '') +
            '<hr style="border-color:#334155;margin:1rem 0;">' +
            '<div class="header-actions" style="margin-top:1rem;">' +
            '<button class="btn btn-primary" onclick="Providers.editSupplier(' + supplier.id + ');app.closeModal();">Editar</button> ' +
            '<button class="btn btn-success" onclick="Providers.showOrderModal(' + supplier.id + ');app.closeModal();">Nuevo Pedido</button>' +
            '</div></div>';
        app.showModal('Detalle del Proveedor', html);
    },

    showOrderModal: function(supplierId) {
        var self = this;
        var supplier = this.suppliers.find(function(s) { return s.id === supplierId; });
        
        fetch('api/providers.php?action=list_products')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                self.allProducts = data.products || [];
                
                var options = self.allProducts.map(function(p) {
                    return '<option value="' + p.id + '" data-price="' + (p.cost_price || p.price) + '">' + self.escapeHtml(p.name) + ' ($' + parseFloat(p.cost_price || p.price).toFixed(2) + ')</option>';
                }).join('');

                var html = '<form onsubmit="event.preventDefault(); Providers.createOrder(' + supplierId + ')">' +
                    '<div class="form-group"><label class="form-label">Proveedor</label>' +
                    '<input type="text" class="form-control" value="' + (supplier ? self.escapeHtml(supplier.name) : '') + '" disabled></div>' +
                    '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">Fecha de Orden</label>' +
                    '<input type="date" id="orderDate" class="form-control" value="' + new Date().toISOString().split('T')[0] + '"></div>' +
                    '<div class="form-group" style="flex:1;"><label class="form-label">Fecha Esperada</label>' +
                    '<input type="date" id="expectedDate" class="form-control"></div></div>' +
                    '<div class="form-group"><label class="form-label">Agregar Productos</label>' +
                    '<select id="orderProduct" class="form-control" onchange="Providers.addProductRow()">' +
                    '<option value="">-- Seleccionar producto --</option>' + options + '</select>' +
                    '<div id="productRows"></div></div>' +
                    '<div class="form-group"><label class="form-label">Notas</label>' +
                    '<textarea id="orderNotes" class="form-control" placeholder="Observaciones del pedido"></textarea></div>' +
                    '<div class="modal-footer">' +
                    '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
                    '<button type="submit" class="btn btn-primary">Crear Pedido</button></div></form>';
                app.showModal('Nuevo Pedido a Proveedor', html);
            })
            .catch(function(e) {
                app.showAlert('Error cargando productos', 'error');
            });
    },

    addProductRow: function() {
        var select = document.getElementById('orderProduct');
        var container = document.getElementById('productRows');
        if (!select || !container || !select.value) return;

        var productId = select.value;
        var product = this.allProducts.find(function(p) { return p.id == productId; });
        if (!product) return;

        var price = product.cost_price || product.price || 0;
        var rowId = 'row_' + Date.now();
        
        var row = document.createElement('div');
        row.id = rowId;
        row.className = 'product-order-row';
        row.style.cssText = 'display:flex;gap:0.5rem;align-items:center;margin-top:0.5rem;padding:0.5rem;background:#1e293b;border-radius:0.5rem;';
        row.innerHTML = 
            '<div style="flex:2;"><strong>' + this.escapeHtml(product.name) + '</strong><br><small class="text-muted">$' + price.toFixed(2) + '</small></div>' +
            '<input type="number" class="form-control" style="flex:1;width:80px;" placeholder="Cant." min="1" data-product-id="' + product.id + '" data-price="' + price + '" id="qty_' + product.id + '">' +
            '<span id="subtotal_' + product.id + '" style="width:80px;text-align:right;">$0.00</span>' +
            '<button type="button" class="btn btn-danger btn-sm" onclick="Providers.removeProductRow(\'' + rowId + '\')">✕</button>';
        container.appendChild(row);
        
        document.getElementById('qty_' + product.id).addEventListener('input', function() {
            var qty = parseInt(this.value) || 0;
            var subtotal = qty * price;
            document.getElementById('subtotal_' + product.id).textContent = '$' + subtotal.toFixed(2);
        });
        
        select.value = '';
    },

    removeProductRow: function(rowId) {
        var row = document.getElementById(rowId);
        if (row) row.remove();
    },

    createOrder: function(supplierId) {
        var self = this;
        var rows = document.querySelectorAll('.product-order-row input[type="number"]');
        var items = [];
        
        rows.forEach(function(row) {
            var qty = parseInt(row.value);
            if (qty > 0) {
                items.push({
                    product_id: parseInt(row.dataset.productId),
                    quantity: qty
                });
            }
        });

        if (items.length === 0) {
            app.showAlert('Agregue al menos un producto', 'error');
            return;
        }

        var orderDate = document.getElementById('orderDate') ? document.getElementById('orderDate').value : '';
        var expectedDate = document.getElementById('expectedDate') ? document.getElementById('expectedDate').value : '';
        var notes = document.getElementById('orderNotes') ? document.getElementById('orderNotes').value : '';

        fetch('api/providers.php?action=create_order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                supplier_id: supplierId,
                items: items,
                order_date: orderDate,
                expected_date: expectedDate,
                notes: notes
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                app.showAlert('Pedido creado: ' + data.order_number);
                app.closeModal();
                self.loadOrders();
            } else {
                throw new Error(data.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    createOrderFromLowStock: function(productId) {
        if (this.suppliers.length > 0) {
            this.showOrderModal(this.suppliers[0].id);
        } else {
            app.showAlert('Primero agregue un proveedor', 'error');
        }
    },

    sendOrder: function(orderId) { this.updateOrderStatus(orderId, 'pending'); },
    confirmOrder: function(orderId) { this.updateOrderStatus(orderId, 'confirmed'); },
    markInTransit: function(orderId) { this.updateOrderStatus(orderId, 'in_transit'); },
    receiveOrder: function(orderId) {
        if (!confirm('¿Confirmar recepción del pedido? Se actualizará el stock.')) return;
        this.updateOrderStatus(orderId, 'received');
    },
    cancelOrder: function(orderId) {
        if (!confirm('¿Cancelar este pedido?')) return;
        this.updateOrderStatus(orderId, 'cancelled');
    },

    updateOrderStatus: function(orderId, status) {
        var self = this;
        fetch('api/providers.php?action=update_order_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, status: status })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                app.showAlert('Estado actualizado');
                self.loadOrders();
                if (typeof Inventory !== 'undefined' && Inventory.loadProducts) {
                    Inventory.loadProducts();
                }
            } else {
                throw new Error(data.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    viewOrder: function(orderId) {
        var self = this;
        fetch('api/providers.php?action=get_order&id=' + orderId)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    throw new Error(data.error);
                }
                var order = data.order;
                var itemsHtml = (order.items || []).map(function(item) {
                    return '<tr><td>' + self.escapeHtml(item.product_name || 'N/A') + '</td>' +
                           '<td>' + item.quantity_ordered + '</td>' +
                           '<td>' + (item.quantity_received || 0) + '</td>' +
                           '<td>$' + parseFloat(item.unit_price || 0).toFixed(2) + '</td>' +
                           '<td>$' + parseFloat(item.subtotal || 0).toFixed(2) + '</td></tr>';
                }).join('');
                
                var statusClass = self.getStatusClass(order.status);
                var statusText = self.getStatusText(order.status);
                
                var html = '<div>' +
                    '<div style="display:flex;justify-content:space-between;margin-bottom:1rem;">' +
                    '<div><h3>' + self.escapeHtml(order.order_number) + '</h3>' +
                    '<p class="text-muted">' + self.escapeHtml(order.supplier_name || '') + '</p></div>' +
                    '<span class="badge ' + statusClass + '" style="font-size:1rem;">' + statusText + '</span></div>' +
                    '<hr style="border-color:#334155;">' +
                    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">' +
                    '<div><strong>Fecha de Orden:</strong><br>' + new Date(order.order_date || order.created_at).toLocaleDateString() + '</div>' +
                    '<div><strong>Fecha Esperada:</strong><br>' + (order.expected_date ? new Date(order.expected_date).toLocaleDateString() : 'No definida') + '</div>' +
                    '<div><strong>Método de Pago:</strong><br>' + self.escapeHtml(order.payment_terms || 'contado') + '</div>' +
                    '<div><strong>Estado de Pago:</strong><br>' + self.escapeHtml(order.payment_status || 'pendiente') + '</div></div>' +
                    (order.notes ? '<p><strong>Notas:</strong> ' + self.escapeHtml(order.notes) + '</p>' : '') +
                    '<h4 style="margin-top:1rem;">Detalle del Pedido</h4>' +
                    '<table class="table"><thead><tr><th>Producto</th><th>Ord.</th><th>Recib.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>' + itemsHtml + '</tbody>' +
                    '<tfoot><tr><td colspan="4" style="text-align:right;"><strong>Total:</strong></td><td><strong>$' + parseFloat(order.total_amount || 0).toFixed(2) + '</strong></td></tr></tfoot></table>' +
                    '</div>';
                app.showModal('Detalle del Pedido', html);
            })
            .catch(function(e) {
                app.showAlert(e.message, 'error');
            });
    },

    editSupplier: function(supplierId) {
        var supplier = this.suppliers.find(function(s) { return s.id === supplierId; });
        if (!supplier) return;

        var html = '<form onsubmit="event.preventDefault(); Providers.saveSupplier(' + supplierId + ')">' +
            '<div class="form-group"><label class="form-label">Nombre *</label>' +
            '<input type="text" id="supName" class="form-control" value="' + this.escapeHtml(supplier.name) + '" required></div>' +
            '<div class="form-group"><label class="form-label">Empresa</label>' +
            '<input type="text" id="supCompany" class="form-control" value="' + this.escapeHtml(supplier.company_name || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">RFC/Tax ID</label>' +
            '<input type="text" id="supRfc" class="form-control" value="' + this.escapeHtml(supplier.rfc_tax_id || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Persona de Contacto</label>' +
            '<input type="text" id="supContact" class="form-control" value="' + this.escapeHtml(supplier.contact_name || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Email</label>' +
            '<input type="email" id="supEmail" class="form-control" value="' + this.escapeHtml(supplier.email || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Teléfono</label>' +
            '<input type="text" id="supPhone" class="form-control" value="' + this.escapeHtml(supplier.phone || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Móvil</label>' +
            '<input type="text" id="supMobile" class="form-control" value="' + this.escapeHtml(supplier.mobile || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Dirección</label>' +
            '<textarea id="supAddress" class="form-control">' + this.escapeHtml(supplier.address || '') + '</textarea></div>' +
            '<div style="display:flex;gap:1rem;"><div class="form-group" style="flex:1;"><label class="form-label">Ciudad</label>' +
            '<input type="text" id="supCity" class="form-control" value="' + this.escapeHtml(supplier.city || '') + '"></div>' +
            '<div class="form-group" style="flex:1;"><label class="form-label">Estado</label>' +
            '<input type="text" id="supState" class="form-control" value="' + this.escapeHtml(supplier.state || '') + '"></div></div>' +
            '<div class="form-group"><label class="form-label">Notas</label>' +
            '<textarea id="supNotes" class="form-control">' + this.escapeHtml(supplier.notes || '') + '</textarea></div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">Guardar</button></div></form>';
        app.showModal('Editar Proveedor', html);
    },

    saveSupplier: function(supplierId) {
        var self = this;
        var data = {
            id: supplierId || null,
            name: document.getElementById('supName').value,
            company_name: document.getElementById('supCompany').value,
            rfc_tax_id: document.getElementById('supRfc').value,
            contact_name: document.getElementById('supContact').value,
            email: document.getElementById('supEmail').value,
            phone: document.getElementById('supPhone').value,
            mobile: document.getElementById('supMobile').value,
            address: document.getElementById('supAddress').value,
            city: document.getElementById('supCity').value,
            state: document.getElementById('supState').value,
            notes: document.getElementById('supNotes') ? document.getElementById('supNotes').value : ''
        };

        fetch('api/providers.php?action=save_supplier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            if (result.success) {
                app.showAlert(supplierId ? 'Proveedor actualizado' : 'Proveedor agregado');
                app.closeModal();
                self.loadSuppliers();
            } else {
                throw new Error(result.error);
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    }
};
