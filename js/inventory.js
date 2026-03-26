// js/inventory.js - Inventory Module
const Inventory = {
    products: [],

    init: async function() {
        await this.loadProducts();
    },

    loadProducts: async function() {
        try {
            const res = await fetch('api/inventory.php?action=list');
            const data = await res.json();
            this.products = data.products || [];
            this.renderTable();
        } catch (e) {
            console.error('Error loading inventory:', e);
            const tbody = document.getElementById('inventoryTable');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Error cargando productos</td></tr>';
        }
    },

    filter: function() {
        const category = document.getElementById('invCategoryFilter').value;
        const stockFilter = document.getElementById('invStockFilter').value;
        const search = document.getElementById('invSearch')?.value?.toLowerCase() || '';
        
        let filtered = this.products;
        
        if (stockFilter === 'low') filtered = filtered.filter(p => p.stock <= p.min_stock);
        if (stockFilter === 'out') filtered = filtered.filter(p => p.stock <= 0);
        if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
        
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

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin productos</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => `
            <tr>
                <td><code>${p.sku || p.id}</code></td>
                <td>
                    <div style="font-weight: 500;">${p.name}</div>
                    <div style="font-size: 0.75rem;" class="text-muted">${p.description || ''}</div>
                </td>
                <td style="font-weight: 600;">$${parseFloat(p.price).toFixed(2)}</td>
                <td>
                    <span class="badge ${p.stock <= 0 ? 'badge-danger' : p.stock <= p.min_stock ? 'badge-warning' : 'badge-success'}">${p.stock}</span>
                </td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="Inventory.showAdjustStockModal(${p.id})">±</button>
                    <button class="btn btn-danger btn-sm" onclick="Inventory.deleteProduct(${p.id})">🗑</button>
                </td>
            </tr>
        `).join('');
    },

    showAdjustStockModal: function(productId) {
        const p = this.products.find(x => x.id === productId);
        if (!p) return;

        const html = `
            <form onsubmit="event.preventDefault(); Inventory.adjustStock(${productId})">
                <div class="form-group">
                    <label class="form-label">Producto</label>
                    <input type="text" class="form-control" value="${p.name}" disabled>
                    <small class="text-muted">Stock actual: ${p.stock}</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo</label>
                    <select id="adjType" class="form-control">
                        <option value="in">Entrada (+)</option>
                        <option value="out">Salida (-)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Cantidad</label>
                    <input type="number" id="adjQty" class="form-control" min="1" required>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `;
        app.showModal('Ajustar Stock', html);
    },

    adjustStock: async function(productId) {
        const type = document.getElementById('adjType').value;
        const qty = parseInt(document.getElementById('adjQty').value);

        try {
            const res = await fetch('api/inventory.php?action=update_stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId, type: type, quantity: qty })
            });
            const data = await res.json();
            if (data.success) {
                app.showAlert('Stock actualizado');
                app.closeModal();
                this.loadProducts();
            } else throw new Error(data.error);
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    deleteProduct: async function(productId) {
        if (!confirm('¿Eliminar este producto?')) return;
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
            } else throw new Error(data.error);
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    }
};

window.Inventory = Inventory;
