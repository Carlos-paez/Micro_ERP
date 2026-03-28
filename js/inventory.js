// js/inventory.js - Inventory Module
const Inventory = {
    products: [],
    categories: [],

    init: function() {
        this.loadProducts();
        this.loadCategories();
    },

    loadProducts: function() {
        const self = this;
        fetch('api/inventory.php?action=list')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    console.error('Error inventory:', data.error);
                    app.showAlert('Error cargando inventario: ' + data.error, 'error');
                    return;
                }
                self.products = data.products || [];
                self.renderTable();
            })
            .catch(function(e) {
                console.error('Error loading inventory:', e);
                app.showAlert('Error de conexión con el servidor', 'error');
            });
    },

    loadCategories: function() {
        const self = this;
        fetch('api/categories.php?action=list')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    console.error('Error categories:', data.error);
                    return;
                }
                self.categories = data.categories || [];
                self.renderCategoryFilter();
            })
            .catch(function(e) {
                console.error('Error loading categories:', e);
            });
    },

    renderCategoryFilter: function() {
        const select = document.getElementById('invCategoryFilter');
        if (!select) return;
        
        select.innerHTML = '<option value="">Todas las categorías</option>' + 
            this.categories.map(function(c) { 
                return '<option value="' + c.id + '">' + c.name + '</option>'; 
            }).join('');
    },

    filter: function() {
        const category = document.getElementById('invCategoryFilter').value;
        const stockFilter = document.getElementById('invStockFilter').value;
        const searchInput = document.getElementById('invSearch');
        const search = searchInput ? searchInput.value.toLowerCase() : '';
        
        let filtered = this.products;
        
        if (category) {
            filtered = filtered.filter(function(p) { return p.category_id == category; });
        }
        if (stockFilter === 'low') {
            filtered = filtered.filter(function(p) { return p.stock <= p.min_stock; });
        }
        if (stockFilter === 'out') {
            filtered = filtered.filter(function(p) { return p.stock <= 0; });
        }
        if (search) {
            filtered = filtered.filter(function(p) { return p.name.toLowerCase().includes(search); });
        }
        
        this.renderFilteredTable(filtered);
    },

    search: function() {
        this.filter();
    },

    renderTable: function() {
        const tbody = document.getElementById('inventoryTable');
        if (!tbody) return;
        this.renderFilteredTable(this.products);
    },

    renderFilteredTable: function(products) {
        const tbody = document.getElementById('inventoryTable');
        if (!tbody) return;

        if (!products || products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin productos</td></tr>';
            return;
        }

        const self = this;
        tbody.innerHTML = products.map(function(p) {
            var stockClass = p.stock <= 0 ? 'badge-danger' : (p.stock <= p.min_stock ? 'badge-warning' : 'badge-success');
            return '<tr>' +
                '<td><code>' + (p.sku || p.id) + '</code></td>' +
                '<td><div style="font-weight:500;">' + p.name + '</div>' +
                '<div style="font-size:0.75rem;" class="text-muted">' + (p.description || '') + '</div></td>' +
                '<td style="font-weight:600;">$' + parseFloat(p.price).toFixed(2) + '</td>' +
                '<td><span class="badge ' + stockClass + '">' + p.stock + '</span></td>' +
                '<td>' +
                '<button class="btn btn-primary btn-sm" onclick="Inventory.showAdjustStockModal(' + p.id + ')">±</button> ' +
                '<button class="btn btn-danger btn-sm" onclick="Inventory.deleteProduct(' + p.id + ')">🗑</button>' +
                '</td></tr>';
        }).join('');
    },

    showAdjustStockModal: function(productId) {
        const p = this.products.find(function(x) { return x.id === productId; });
        if (!p) return;

        const html = '<form onsubmit="event.preventDefault(); Inventory.adjustStock(' + productId + ')">' +
            '<div class="form-group">' +
            '<label class="form-label">Producto</label>' +
            '<input type="text" class="form-control" value="' + p.name + '" disabled>' +
            '<small class="text-muted">Stock actual: ' + p.stock + '</small>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Tipo</label>' +
            '<select id="adjType" class="form-control">' +
            '<option value="in">Entrada (+)</option>' +
            '<option value="out">Salida (-)</option>' +
            '</select>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Cantidad</label>' +
            '<input type="number" id="adjQty" class="form-control" min="1" required>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">Guardar</button>' +
            '</div></form>';
        app.showModal('Ajustar Stock', html);
    },

    adjustStock: function(productId) {
        const self = this;
        const type = document.getElementById('adjType').value;
        const qty = parseInt(document.getElementById('adjQty').value);

        fetch('api/inventory.php?action=update_stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, type: type, quantity: qty })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                app.showAlert('Stock actualizado');
                app.closeModal();
                self.loadProducts();
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    },

    deleteProduct: function(productId) {
        const self = this;
        if (!confirm('¿Eliminar este producto?')) return;
        
        fetch('api/inventory.php?action=delete_product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                app.showAlert('Producto eliminado');
                self.loadProducts();
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        })
        .catch(function(e) {
            app.showAlert(e.message, 'error');
        });
    }
};
