// js/inventory.js - Enhanced Inventory Module
const Inventory = {
    products: [],
    categories: [],
    filteredProducts: [],

    init: async function() {
        await this.loadCategories();
        await this.loadProducts();
    },

    loadCategories: async function() {
        try {
            const res = await fetch('api/categories.php?action=list');
            const data = await res.json();
            this.categories = data.categories || [];
            
            const select = document.getElementById('invCategoryFilter');
            if (select) {
                select.innerHTML = '<option value="">Todas las categorías</option>' +
                    this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }
        } catch (e) {
            console.error('Error loading categories:', e);
        }
    },

    loadProducts: async function() {
        try {
            const res = await fetch('api/inventory.php?action=list');
            const data = await res.json();
            this.products = data.products || [];
            this.filteredProducts = this.products;
            this.renderTable();
            this.renderSummary();
        } catch (e) {
            app.showAlert('Error cargando inventario', 'error');
        }
    },

    filterByCategory: function() {
        const categoryId = document.getElementById('invCategoryFilter').value;
        const stockFilter = document.getElementById('invStockFilter').value;
        this.applyFilters(categoryId, stockFilter);
    },

    filterByStock: function() {
        const categoryId = document.getElementById('invCategoryFilter').value;
        const stockFilter = document.getElementById('invStockFilter').value;
        this.applyFilters(categoryId, stockFilter);
    },

    search: function() {
        const query = document.getElementById('invSearch').value.toLowerCase();
        const categoryId = document.getElementById('invCategoryFilter').value;
        const stockFilter = document.getElementById('invStockFilter').value;
        
        this.filteredProducts = this.products.filter(p => {
            const matchSearch = !query || 
                p.name.toLowerCase().includes(query) || 
                (p.sku && p.sku.toLowerCase().includes(query));
            
            const matchCategory = !categoryId || p.category_id == categoryId;
            
            let matchStock = true;
            if (stockFilter === 'low') matchStock = p.stock <= p.min_stock;
            else if (stockFilter === 'out') matchStock = p.stock <= 0;
            
            return matchSearch && matchCategory && matchStock;
        });
        
        this.renderTable();
    },

    applyFilters: function(categoryId, stockFilter) {
        this.filteredProducts = this.products.filter(p => {
            const matchCategory = !categoryId || p.category_id == categoryId;
            
            let matchStock = true;
            if (stockFilter === 'low') matchStock = p.stock <= p.min_stock;
            else if (stockFilter === 'out') matchStock = p.stock <= 0;
            
            return matchCategory && matchStock;
        });
        
        this.renderTable();
    },

    renderTable: function() {
        const tbody = document.getElementById('inventoryTable');
        if (!tbody) return;

        if (this.filteredProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay productos que coincidan</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredProducts.map(p => {
            const stockClass = p.stock <= 0 ? 'badge-danger' : 
                              p.stock <= p.min_stock ? 'badge-warning' : 'badge-success';
            
            return `
                <tr>
                    <td><code>${p.sku || '-'}</code></td>
                    <td>
                        <div style="font-weight: 500;">${p.name}</div>
                        <div style="font-size: 0.75rem;" class="text-muted">${p.description || ''}</div>
                    </td>
                    <td>${p.category_name || '-'}</td>
                    <td class="text-success" style="font-weight: 600;">$${parseFloat(p.price).toFixed(2)}</td>
                    <td class="text-muted">$${parseFloat(p.cost_price || 0).toFixed(2)}</td>
                    <td>
                        <span class="badge ${stockClass}">${p.stock} ${p.unit || 'u'}</span>
                        ${p.location ? `<div style="font-size: 0.7rem;" class="text-muted">📍 ${p.location}</div>` : ''}
                    </td>
                    <td class="text-primary">$${parseFloat(p.stock_value || 0).toFixed(2)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-sm" onclick="Inventory.showAdjustStockModal(${p.id})" title="Ajustar Stock">±</button>
                            <button class="btn btn-secondary btn-sm" onclick="Inventory.showHistory(${p.id})" title="Historial">📋</button>
                            <button class="btn btn-danger btn-sm" onclick="Inventory.deleteProduct(${p.id})" title="Eliminar">🗑</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderSummary: function() {
        const container = document.getElementById('inventorySummary');
        if (!container) return;

        const totalProducts = this.products.length;
        const totalValue = this.products.reduce((sum, p) => sum + (parseFloat(p.stock_value) || 0), 0);
        const lowStock = this.products.filter(p => p.stock <= p.min_stock).length;
        const outOfStock = this.products.filter(p => p.stock <= 0).length;

        container.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">Total Productos:</span>
                <span class="summary-value">${totalProducts}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Valor Total:</span>
                <span class="summary-value text-success">$${totalValue.toFixed(2)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Stock Bajo:</span>
                <span class="summary-value text-warning">${lowStock}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Agotados:</span>
                <span class="summary-value text-danger">${outOfStock}</span>
            </div>
        `;
    },

    showAdjustStockModal: function(productId) {
        const p = this.products.find(x => x.id === productId);
        if (!p) return;

        const html = `
            <form onsubmit="event.preventDefault(); Inventory.adjustStock(${productId})">
                <div class="form-group">
                    <label class="form-label">Producto</label>
                    <input type="text" class="form-control" value="${p.name}" disabled>
                    <small class="text-muted">Stock actual: ${p.stock} ${p.unit || 'u'}</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Movimiento</label>
                    <select id="adjType" class="form-control">
                        <option value="in">Entrada (+)</option>
                        <option value="out">Salida (-)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Cantidad</label>
                    <input type="number" id="adjQty" class="form-control" min="1" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <input type="text" id="adjNotes" class="form-control" placeholder="Razón del ajuste...">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Ajuste</button>
                </div>
            </form>
        `;
        app.showModal('Ajustar Stock', html);
    },

    adjustStock: async function(productId) {
        const type = document.getElementById('adjType').value;
        const qty = parseInt(document.getElementById('adjQty').value, 10);
        const notes = document.getElementById('adjNotes').value;

        try {
            const res = await fetch('api/inventory.php?action=update_stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId, type: type, quantity: qty, notes: notes })
            });
            const data = await res.json();
            if (data.success) {
                app.showAlert(`Stock ajustado. Nuevo stock: ${data.stock}`);
                app.closeModal();
                this.loadProducts();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    showHistory: async function(productId) {
        try {
            const res = await fetch(`api/inventory.php?action=transactions&product_id=${productId}&limit=20`);
            const data = await res.json();
            const transactions = data.transactions || [];
            const product = this.products.find(p => p.id === productId);

            const html = `
                <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Cantidad</th>
                                <th>Antes</th>
                                <th>Después</th>
                                <th>Notas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.length === 0 ? 
                                '<tr><td colspan="6" class="text-center text-muted">Sin movimientos</td></tr>' :
                                transactions.map(t => {
                                    const typeClass = t.type === 'in' ? 'text-success' : 'text-danger';
                                    const typeIcon = t.type === 'in' ? '+' : '-';
                                    return `
                                        <tr>
                                            <td>${new Date(t.created_at).toLocaleString()}</td>
                                            <td class="${typeClass}">${typeIcon}${t.type.toUpperCase()}</td>
                                            <td>${t.quantity}</td>
                                            <td>${t.stock_before}</td>
                                            <td>${t.stock_after}</td>
                                            <td>${t.notes || '-'}</td>
                                        </tr>
                                    `;
                                }).join('')
                            }
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cerrar</button>
                </div>
            `;
            app.showModal(`Historial - ${product?.name || 'Producto'}`, html);
        } catch (e) {
            app.showAlert('Error cargando historial', 'error');
        }
    },

    deleteProduct: async function(productId) {
        if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;

        try {
            const res = await fetch('api/inventory.php?action=delete_product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId })
            });
            const data = await res.json();
            if (data.success) {
                app.showAlert('Producto eliminado');
                this.loadProducts();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    }
};

window.Inventory = Inventory;
