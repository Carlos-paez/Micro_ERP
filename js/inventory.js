// js/inventory.js
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
            app.showAlert('Error cargando inventario', 'error');
        }
    },

    renderTable: function() {
        const tbody = document.getElementById('inventoryTable');
        if (!tbody) return;

        if (this.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay productos en el inventario</td></tr>';
            return;
        }

        tbody.innerHTML = this.products.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>
                    <div style="font-weight: 500;">${p.name}</div>
                    <div style="font-size: 0.75rem;" class="text-muted">${p.description || ''}</div>
                </td>
                <td style="font-weight: 600;">$${parseFloat(p.price).toFixed(2)}</td>
                <td>
                    <span class="badge ${p.stock < 10 ? 'badge-danger' : 'badge-success'}">${p.stock}</span>
                </td>
                <td style="display: flex; gap: 0.5rem; justify-content: flex-start;">
                    <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="Inventory.showAdjustStockModal(${p.id})">Ajustar</button>
                    <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="Inventory.deleteProduct(${p.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');
    },

    showAdjustStockModal: function(productId) {
        const p = this.products.find(x => x.id === productId);
        if(!p) return;

        const html = `
            <form id="adjustForm" onsubmit="event.preventDefault(); Inventory.adjustStock(${productId})">
                <div class="form-group">
                    <label class="form-label">Producto</label>
                    <input type="text" class="form-control" value="${p.name}" disabled>
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

        try {
            const res = await fetch('api/inventory.php?action=update_stock', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ product_id: productId, type: type, quantity: qty, notes: 'Manual adjustment' })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Stock ajustado con éxito');
                app.closeModal();
                this.loadProducts();
            } else throw new Error(data.error);
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    },

    deleteProduct: async function(productId) {
        if(!confirm('¿Estás SEGURO de querer eliminar este producto? Esto eliminará también los registros de ventas asociados a él de forma permanente.')) {
            return;
        }

        try {
            const res = await fetch('api/inventory.php?action=delete_product', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ product_id: productId })
            });
            const data = await res.json();
            if(data.success) {
                app.showAlert('Producto eliminado con éxito');
                this.loadProducts();
            } else throw new Error(data.error);
        } catch (e) {
            app.showAlert(e.message, 'error');
        }
    }
};

// Global hooks for App template Buttons
app.showAddProductModal = function() {
    const html = `
        <form onsubmit="event.preventDefault(); window.Inventory_createProduct()">
            <div class="form-group">
                <label class="form-label">Nombre</label>
                <input type="text" id="addName" class="form-control" required>
            </div>
            <div class="form-group">
                <label class="form-label">Descripción</label>
                <input type="text" id="addDesc" class="form-control">
            </div>
            <div class="form-group">
                <label class="form-label">Precio</label>
                <input type="number" id="addPrice" class="form-control" step="0.01" min="0" required>
            </div>
            <div class="form-group">
                <label class="form-label">Stock Inicial</label>
                <input type="number" id="addStock" class="form-control" min="0" value="0" required>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear</button>
            </div>
        </form>
    `;
    app.showModal('Nuevo Producto', html);
};

window.Inventory_createProduct = async function() {
    const payload = {
        name: document.getElementById('addName').value,
        description: document.getElementById('addDesc').value,
        price: parseFloat(document.getElementById('addPrice').value),
        stock: parseInt(document.getElementById('addStock').value, 10)
    };
    try {
        const res = await fetch('api/inventory.php?action=add_product', {
            method: 'POST',
            headers:{ 'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            app.showAlert('Producto creado');
            app.closeModal();
            Inventory.loadProducts();
        } else throw new Error(data.error);
    } catch (e) {
        app.showAlert(e.message, 'error');
    }
};

app.showSellModal = function() {
    if(!Inventory.products || Inventory.products.length === 0) {
        app.showAlert('No hay productos', 'warning'); return;
    }
    const html = `
        <form onsubmit="event.preventDefault(); window.Inventory_executeSale()">
            <div class="form-group">
                <label class="form-label">Seleccionar Producto</label>
                <select id="sellProd" class="form-control" onchange="window.Inventory_sellProdChange()">
                    <option value="">-- Seleccionar --</option>
                    ${Inventory.products.filter(p => p.stock > 0).map(p => `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}">${p.name} ($${p.price} | Stock: ${p.stock})</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Cantidad</label>
                <input type="number" id="sellQty" class="form-control" min="1" disabled required oninput="window.Inventory_sellQtyChange()">
            </div>
            <div class="form-group">
                <div class="stat-card" style="padding: 1rem; margin-top: 1rem;">
                    <div class="stat-title text-center">Total Venta</div>
                    <div id="sellTotalDisplay" class="stat-value text-success text-center">$0.00</div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" onclick="app.closeModal()">Cancelar</button>
                <button type="submit" id="btnSellConfirm" class="btn btn-warning" disabled>Confirmar Venta</button>
            </div>
        </form>
    `;
    app.showModal('Registrar Venta Directa', html);
};

window.Inventory_sellProdChange = function() {
    const sel = document.getElementById('sellProd');
    const input = document.getElementById('sellQty');
    if(!sel.value) {
        input.disabled = true;
        input.value = '';
    } else {
        const opt = sel.selectedOptions[0];
        input.disabled = false;
        input.max = opt.dataset.stock;
        input.value = 1;
    }
    window.Inventory_sellQtyChange();
};

window.Inventory_sellQtyChange = function() {
    const sel = document.getElementById('sellProd');
    const input = document.getElementById('sellQty');
    const btn = document.getElementById('btnSellConfirm');
    const display = document.getElementById('sellTotalDisplay');

    if(!sel.value || !input.value || parseInt(input.value) <= 0 || parseInt(input.value) > parseInt(sel.selectedOptions[0].dataset.stock)) {
        btn.disabled = true;
        display.textContent = '$0.00';
        return;
    }
    
    btn.disabled = false;
    const total = parseFloat(sel.selectedOptions[0].dataset.price) * parseInt(input.value);
    display.textContent = '$' + total.toFixed(2);
};

window.Inventory_executeSale = async function() {
    const sel = document.getElementById('sellProd');
    const qty = parseInt(document.getElementById('sellQty').value, 10);
    const price = parseFloat(sel.selectedOptions[0].dataset.price);
    const prodId = parseInt(sel.value, 10);

    const payload = { items: [{ product_id: prodId, quantity: qty, price: price }] };

    try {
        const res = await fetch('api/inventory.php?action=sell', {
            method: 'POST',
            headers:{ 'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            app.showAlert('Venta registrada con éxito');
            app.closeModal();
            Inventory.loadProducts();
        } else throw new Error(data.error);
    } catch(e) {
        app.showAlert(e.message, 'error');
    }
};
