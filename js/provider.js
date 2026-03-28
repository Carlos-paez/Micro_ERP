// js/provider.js - Providers Module
const Providers = {
    suppliers: [],
    orders: [],
    allProducts: [],
    lowStockProducts: [],

    init: function() {
        this.loadSuppliers();
        this.loadOrders();
        this.loadLowStock();
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
                self.renderSuppliers();
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
                    self.renderLowStock();
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

        grid.innerHTML = this.suppliers.map(function(s) {
            return '<div class="supplier-card">' +
                '<div class="supplier-header">' +
                '<div>' +
                '<div class="supplier-name">' + s.name + '</div>' +
                '<div class="supplier-company">' + (s.company_name || '') + '</div>' +
                '</div>' +
                '</div>' +
                '<div class="supplier-contact">' +
                '<p>📧 ' + (s.email || 'Sin email') + '</p>' +
                '<p>📞 ' + (s.phone || 'Sin teléfono') + '</p>' +
                '<p>🏢 ' + (s.city || 'Sin ciudad') + '</p>' +
                '</div>' +
                '<div class="supplier-actions">' +
                '<button class="btn btn-primary btn-sm" onclick="Providers.showOrderModal(' + s.id + ')">Nuevo Pedido</button>' +
                '<button class="btn btn-secondary btn-sm" onclick="Providers.editSupplier(' + s.id + ')">Editar</button>' +
                '</div></div>';
        }).join('');
    },

    renderOrders: function() {
        var tbody = document.getElementById('ordersTable');
        if (!tbody) return;

        if (this.orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay pedidos</td></tr>';
            return;
        }

        var self = this;
        tbody.innerHTML = this.orders.map(function(o) {
            var statusClass = self.getStatusClass(o.status);
            var statusText = self.getStatusText(o.status);
            var actions = self.getOrderActions(o);
            
            return '<tr>' +
                '<td><strong>' + o.order_number + '</strong></td>' +
                '<td>' + (o.supplier_name || 'N/A') + '</td>' +
                '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
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
        if (order.status === 'draft') {
            return '<button class="btn btn-primary btn-sm" onclick="Providers.sendOrder(' + order.id + ')">Enviar</button> ' +
                   '<button class="btn btn-danger btn-sm" onclick="Providers.cancelOrder(' + order.id + ')">Cancelar</button>';
        }
        if (order.status === 'confirmed' || order.status === 'in_transit') {
            return '<button class="btn btn-success btn-sm" onclick="Providers.receiveOrder(' + order.id + ')">Recibir</button>';
        }
        if (order.status === 'pending') {
            return '<button class="btn btn-primary btn-sm" onclick="Providers.confirmOrder(' + order.id + ')">Confirmar</button> ' +
                   '<button class="btn btn-danger btn-sm" onclick="Providers.cancelOrder(' + order.id + ')">Cancelar</button>';
        }
        return '<button class="btn btn-secondary btn-sm" onclick="Providers.viewOrder(' + order.id + ')">Ver</button>';
    },

    renderLowStock: function() {
        var section = document.getElementById('lowStockSection');
        var tbody = document.getElementById('lowStockTable2');
        if (!tbody) return;

        if (this.lowStockProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay productos con stock bajo</td></tr>';
            return;
        }

        var self = this;
        tbody.innerHTML = this.lowStockProducts.map(function(p) {
            return '<tr>' +
                '<td><code>' + (p.sku || p.id) + '</code></td>' +
                '<td>' + p.name + '</td>' +
                '<td><span class="badge badge-danger">' + p.stock + '</span></td>' +
                '<td>' + p.min_stock + '</td></tr>';
        }).join('');
    },

    showOrderModal: function(supplierId) {
        var self = this;
        var supplier = this.suppliers.find(function(s) { return s.id === supplierId; });
        
        fetch('api/providers.php?action=list_products')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                self.allProducts = data.products || [];
                
                var options = self.allProducts.map(function(p) {
                    return '<option value="' + p.id + '" data-price="' + (p.cost_price || p.price) + '">' + p.name + ' ($' + parseFloat(p.cost_price || p.price).toFixed(2) + ')</option>';
                }).join('');

                var html = '<form onsubmit="event.preventDefault(); Providers.createOrder(' + supplierId + ')">' +
                    '<div class="form-group">' +
                    '<label class="form-label">Proveedor</label>' +
                    '<input type="text" class="form-control" value="' + (supplier ? supplier.name : '') + '" disabled></div>' +
                    '<div class="form-group">' +
                    '<label class="form-label">Fecha Esperada</label>' +
                    '<input type="date" id="orderDate" class="form-control"></div>' +
                    '<div class="form-group">' +
                    '<label class="form-label">Notas</label>' +
                    '<textarea id="orderNotes" class="form-control"></textarea></div>' +
                    '<div class="form-group">' +
                    '<label class="form-label">Productos</label>' +
                    '<select id="orderProduct" class="form-control" onchange="Providers.addProductRow()">' +
                    '<option value="">-- Seleccionar producto --</option>' + options + '</select>' +
                    '<div id="productRows"></div></div>' +
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

        var row = document.createElement('div');
        row.className = 'form-group';
        row.innerHTML = '<label>' + product.name + '</label>' +
            '<input type="number" class="form-control" placeholder="Cantidad" data-product-id="' + product.id + '" data-price="' + (product.cost_price || product.price) + '" min="1">';
        container.appendChild(row);
        select.value = '';
    },

    createOrder: function(supplierId) {
        var self = this;
        var rows = document.querySelectorAll('#productRows input');
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

        var expectedDate = document.getElementById('orderDate') ? document.getElementById('orderDate').value : '';
        var notes = document.getElementById('orderNotes') ? document.getElementById('orderNotes').value : '';

        fetch('api/providers.php?action=create_order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                supplier_id: supplierId,
                items: items,
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

    sendOrder: function(orderId) {
        this.updateOrderStatus(orderId, 'pending');
    },

    confirmOrder: function(orderId) {
        this.updateOrderStatus(orderId, 'confirmed');
    },

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
                    return '<tr><td>' + item.product_name + '</td><td>' + item.quantity_ordered + '</td><td>$' + parseFloat(item.unit_price).toFixed(2) + '</td></tr>';
                }).join('');
                
                var html = '<div>' +
                    '<p><strong>Pedido:</strong> ' + order.order_number + '</p>' +
                    '<p><strong>Proveedor:</strong> ' + order.supplier_name + '</p>' +
                    '<p><strong>Fecha:</strong> ' + new Date(order.created_at).toLocaleDateString() + '</p>' +
                    '<p><strong>Total:</strong> $' + parseFloat(order.total_amount || 0).toFixed(2) + '</p>' +
                    '<table class="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th></tr></thead><tbody>' + itemsHtml + '</tbody></table>' +
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
            '<div class="form-group"><label class="form-label">Nombre</label>' +
            '<input type="text" id="supName" class="form-control" value="' + supplier.name + '" required></div>' +
            '<div class="form-group"><label class="form-label">Empresa</label>' +
            '<input type="text" id="supCompany" class="form-control" value="' + (supplier.company_name || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Email</label>' +
            '<input type="email" id="supEmail" class="form-control" value="' + (supplier.email || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Teléfono</label>' +
            '<input type="text" id="supPhone" class="form-control" value="' + (supplier.phone || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Ciudad</label>' +
            '<input type="text" id="supCity" class="form-control" value="' + (supplier.city || '') + '"></div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">Guardar</button></div></form>';
        app.showModal('Editar Proveedor', html);
    },

    saveSupplier: function(supplierId) {
        var self = this;
        var data = {
            id: supplierId,
            name: document.getElementById('supName').value,
            company_name: document.getElementById('supCompany').value,
            email: document.getElementById('supEmail').value,
            phone: document.getElementById('supPhone').value,
            city: document.getElementById('supCity').value
        };

        fetch('api/providers.php?action=save_supplier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            if (result.success) {
                app.showAlert('Proveedor actualizado');
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
