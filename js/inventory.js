// js/inventory.js - Inventory Module
const Inventory = {
    products: [],
    categories: [],

    init: function() {
        this.loadProducts();
        this.loadCategories();
        this.updateStats();
    },

    loadProducts: function() {
        var self = this;
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
                self.updateStats();
            })
            .catch(function(e) {
                console.error('Error loading inventory:', e);
                app.showAlert('Error de conexión con el servidor', 'error');
            });
    },

    loadCategories: function() {
        var self = this;
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

    updateStats: function() {
        var total = this.products.length;
        var lowStock = this.products.filter(function(p) { return p.stock > 0 && p.stock <= p.min_stock; }).length;
        var outOfStock = this.products.filter(function(p) { return p.stock <= 0; }).length;
        var totalValue = this.products.reduce(function(acc, p) { return acc + (parseFloat(p.price) * p.stock); }, 0);
        
        var statTotal = document.getElementById('statTotalProducts');
        var statValue = document.getElementById('statInventoryValue');
        var statLow = document.getElementById('statLowStock');
        var statOut = document.getElementById('statOutOfStock');
        
        if (statTotal) statTotal.textContent = total;
        if (statValue) statValue.textContent = '$' + totalValue.toFixed(2);
        if (statLow) statLow.textContent = lowStock;
        if (statOut) statOut.textContent = outOfStock;
    },

    renderCategoryFilter: function() {
        var select = document.getElementById('invCategoryFilter');
        if (!select) return;
        
        var self = this;
        select.innerHTML = '<option value="">Todas las categorías</option>' + 
            this.categories.map(function(c) { 
                return '<option value="' + c.id + '">' + self.escapeHtml(c.name) + '</option>'; 
            }).join('');
    },

    escapeHtml: function(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    filter: function() {
        var category = document.getElementById('invCategoryFilter') ? document.getElementById('invCategoryFilter').value : '';
        var stockFilter = document.getElementById('invStockFilter') ? document.getElementById('invStockFilter').value : '';
        var sortFilter = document.getElementById('invSortFilter') ? document.getElementById('invSortFilter').value : 'name';
        var searchInput = document.getElementById('invSearch');
        var search = searchInput ? searchInput.value.toLowerCase() : '';
        
        var filtered = this.products.slice();
        
        if (category) {
            filtered = filtered.filter(function(p) { return p.category_id == category; });
        }
        if (stockFilter === 'low') {
            filtered = filtered.filter(function(p) { return p.stock > 0 && p.stock <= p.min_stock; });
        } else if (stockFilter === 'out') {
            filtered = filtered.filter(function(p) { return p.stock <= 0; });
        } else if (stockFilter === 'normal') {
            filtered = filtered.filter(function(p) { return p.stock > p.min_stock; });
        }
        if (search) {
            filtered = filtered.filter(function(p) { 
                return (p.name && p.name.toLowerCase().includes(search)) || 
                       (p.sku && p.sku.toLowerCase().includes(search)) ||
                       (p.barcode && p.barcode.toLowerCase().includes(search));
            });
        }
        
        filtered.sort(function(a, b) {
            if (sortFilter === 'stock_asc') return a.stock - b.stock;
            if (sortFilter === 'stock_desc') return b.stock - a.stock;
            if (sortFilter === 'price_asc') return parseFloat(a.price) - parseFloat(b.price);
            if (sortFilter === 'price_desc') return parseFloat(b.price) - parseFloat(a.price);
            if (sortFilter === 'value_desc') return (b.price * b.stock) - (a.price * a.stock);
            return (a.name || '').localeCompare(b.name || '');
        });
        
        this.renderFilteredTable(filtered);
    },

    search: function() {
        this.filter();
    },

    renderTable: function() {
        var tbody = document.getElementById('inventoryTable');
        if (!tbody) return;
        this.renderFilteredTable(this.products);
    },

    renderFilteredTable: function(products) {
        var tbody = document.getElementById('inventoryTable');
        if (!tbody) return;

        if (!products || products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><span class="empty-state-icon">📦</span><div class="empty-state-title">Sin productos</div><div class="empty-state-text">Agrega productos al inventario para comenzar</div><button class="btn btn-primary" onclick="app.showAddProductModal()">+ Agregar Producto</button></div></td></tr>';
            return;
        }

        var self = this;
        tbody.innerHTML = products.map(function(p) {
            var stockClass = p.stock <= 0 ? 'badge-danger' : (p.stock <= p.min_stock ? 'badge-warning' : 'badge-success');
            var stockStatus = p.stock <= 0 ? 'AGOTADO' : (p.stock <= p.min_stock ? 'BAJO' : 'OK');
            var stockValue = parseFloat(p.price || 0) * p.stock;
            
            return '<tr>' +
                '<td><code>' + self.escapeHtml(p.sku || p.id) + '</code></td>' +
                '<td><div style="font-weight:500;">' + self.escapeHtml(p.name) + '</div>' +
                '<div style="font-size:0.7rem;" class="text-muted">' + self.escapeHtml(p.description || '').substring(0, 50) + '</div></td>' +
                '<td><span class="badge badge-secondary">' + self.escapeHtml(p.category_name || 'Sin categoría') + '</span></td>' +
                '<td style="font-weight:600;color:#10b981;">$' + parseFloat(p.price || 0).toFixed(2) + '</td>' +
                '<td style="color:#64748b;">$' + parseFloat(p.cost_price || 0).toFixed(2) + '</td>' +
                '<td><span class="badge ' + stockClass + '">' + p.stock + '</span> ' +
                '<span style="font-size:0.65rem;color:#64748b;">(' + stockStatus + ')</span></td>' +
                '<td style="font-weight:500;">$' + stockValue.toFixed(2) + '</td>' +
                '<td>' +
                '<button class="btn btn-primary btn-sm" onclick="Inventory.showAdjustStockModal(' + p.id + ')" title="Ajustar Stock">±</button> ' +
                '<button class="btn btn-secondary btn-sm" onclick="Inventory.viewProduct(' + p.id + ')" title="Ver">👁</button> ' +
                '<button class="btn btn-danger btn-sm" onclick="Inventory.deleteProduct(' + p.id + ')" title="Eliminar">🗑</button>' +
                '</td></tr>';
        }).join('');
    },

    viewProduct: function(productId) {
        var p = this.products.find(function(x) { return x.id === productId; });
        if (!p) return;
        
        var self = this;
        var stockValue = parseFloat(p.price || 0) * p.stock;
        var profit = (parseFloat(p.price || 0) - parseFloat(p.cost_price || 0)) * p.stock;
        
        var html = '<div class="product-detail">' +
            '<h3>' + self.escapeHtml(p.name) + '</h3>' +
            '<p class="text-muted"><code>' + self.escapeHtml(p.sku || 'Sin SKU') + '</code></p>' +
            '<hr style="border-color:#334155;margin:1rem 0;">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">' +
            '<div><strong>Categoría:</strong><br>' + self.escapeHtml(p.category_name || 'Sin categoría') + '</div>' +
            '<div><strong>Unidad:</strong><br>' + self.escapeHtml(p.unit || 'unidad') + '</div>' +
            '<div><strong>Precio Venta:</strong><br><span style="color:#10b981;font-weight:bold;">$' + parseFloat(p.price || 0).toFixed(2) + '</span></div>' +
            '<div><strong>Precio Costo:</strong><br>$' + parseFloat(p.cost_price || 0).toFixed(2) + '</div>' +
            '<div><strong>Stock Actual:</strong><br><span class="badge ' + (p.stock <= 0 ? 'badge-danger' : (p.stock <= p.min_stock ? 'badge-warning' : 'badge-success')) + '">' + p.stock + '</span></div>' +
            '<div><strong>Stock Mínimo:</strong><br>' + p.min_stock + '</div>' +
            '<div><strong>Stock Máximo:</strong><br>' + p.max_stock + '</div>' +
            '<div><strong>Valor Total:</strong><br><span style="color:#10b981;">$' + stockValue.toFixed(2) + '</span></div></div>' +
            '<p><strong>Ubicación:</strong> ' + self.escapeHtml(p.location || 'No asignada') + '</p>' +
            '<p><strong>Código Barras:</strong> ' + self.escapeHtml(p.barcode || 'N/A') + '</p>' +
            (p.description ? '<p><strong>Descripción:</strong><br>' + self.escapeHtml(p.description) + '</p>' : '') +
            '<hr style="border-color:#334155;margin:1rem 0;">' +
            '<p><strong>Utilidad Potencial:</strong> <span style="color:#10b981;">$' + profit.toFixed(2) + '</span></p>' +
            '<p><strong>Creado:</strong> ' + new Date(p.created_at).toLocaleString() + '</p>' +
            '<div class="header-actions" style="margin-top:1rem;">' +
            '<button class="btn btn-primary" onclick="Inventory.showAdjustStockModal(' + p.id + ');app.closeModal();">± Ajustar Stock</button> ' +
            '<button class="btn btn-success" onclick="app.closeModal();app.showSellModal();">💰 Vender</button>' +
            '</div></div>';
        app.showModal('Detalle del Producto', html);
    },

    showAdjustStockModal: function(productId) {
        var p = this.products.find(function(x) { return x.id === productId; });
        if (!p) return;

        var html = '<form onsubmit="event.preventDefault(); Inventory.adjustStock(' + productId + ')">' +
            '<div class="form-group">' +
            '<label class="form-label">Producto</label>' +
            '<input type="text" class="form-control" value="' + this.escapeHtml(p.name) + '" disabled>' +
            '<small class="text-muted">Stock actual: <strong>' + p.stock + '</strong> ' + this.escapeHtml(p.unit || 'unidad') + '</small>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Tipo de Movimiento</label>' +
            '<select id="adjType" class="form-control">' +
            '<option value="in">📥 Entrada (Agregar stock)</option>' +
            '<option value="out">📤 Salida (Quitar stock)</option>' +
            '</select>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Cantidad</label>' +
            '<input type="number" id="adjQty" class="form-control" min="1" required placeholder="Cantidad">' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Notas (opcional)</label>' +
            '<textarea id="adjNotes" class="form-control" placeholder="Razón del ajuste..."></textarea>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>' +
            '<button type="submit" class="btn btn-primary">Guardar Ajuste</button>' +
            '</div></form>';
        app.showModal('Ajustar Stock', html);
    },

    adjustStock: function(productId) {
        var self = this;
        var type = document.getElementById('adjType').value;
        var qty = parseInt(document.getElementById('adjQty').value);
        var notes = document.getElementById('adjNotes') ? document.getElementById('adjNotes').value : '';

        fetch('api/inventory.php?action=update_stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, type: type, quantity: qty, notes: notes })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                app.showAlert('Stock actualizado. Nuevo stock: ' + data.stock);
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
        var self = this;
        if (!confirm('¿Está seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;
        
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
