document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. Navegación, Menú Móvil y Config Drawer
  // =========================================================================
  const sidebar = document.getElementById('sidebar');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const toggleConfigBtn = document.getElementById('toggle-config-btn');
  const configDrawer = document.getElementById('config-drawer');
  const navItems = document.querySelectorAll('.nav-item');

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      if (sidebar) sidebar.classList.remove('open');
    });
  });

  if (toggleConfigBtn && configDrawer) {
    toggleConfigBtn.addEventListener('click', () => {
      configDrawer.classList.toggle('hidden');
    });
  }

  // Botones "Limpiar" de resultados
  document.querySelectorAll('.btn-clear').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-result');
      if (targetId) UI.clearResult(targetId);
    });
  });

  // Helpers generales para agregar pares clave-valor dinámicos
  function createKvRow(container) {
    const row = document.createElement('div');
    row.className = 'kv-row';
    row.innerHTML = `
      <input type="text" class="kv-key" placeholder="Columna (ej. estado)" />
      <input type="text" class="kv-val" placeholder="Valor" />
      <button type="button" class="btn-icon-remove" title="Quitar campo">✕</button>
    `;
    row.querySelector('.btn-icon-remove').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  function collectExtraFields(container) {
    const extra = {};
    if (!container) return extra;
    container.querySelectorAll('.kv-row').forEach(row => {
      const k = row.querySelector('.kv-key').value.trim();
      const v = row.querySelector('.kv-val').value;
      if (k) {
        if (v === 'true') extra[k] = true;
        else if (v === 'false') extra[k] = false;
        else if (v !== '' && !Number.isNaN(Number(v)) && v.trim() === String(Number(v))) {
          extra[k] = Number(v);
        } else {
          extra[k] = v;
        }
      }
    });
    return extra;
  }

  // =========================================================================
  // 2. TABLA PRINCIPAL PAGINADA (10 rows por defecto) CON ACCIONES CRUD
  // =========================================================================
  let currentPage = 1;
  let pageSize = 10;
  let totalRecords = null;

  const resMainTable = document.getElementById('res-main-table');
  const paginationInfo = document.getElementById('pagination-info');
  const lblPageCurrent = document.getElementById('lbl-page-current');
  const lblRangeCurrent = document.getElementById('lbl-range-current');
  const btnPageFirst = document.getElementById('btn-page-first');
  const btnPagePrev = document.getElementById('btn-page-prev');
  const btnPageNext = document.getElementById('btn-page-next');
  const selectPageSize = document.getElementById('select-page-size');
  const btnRefreshTable = document.getElementById('btn-refresh-table');

  async function loadPaginatedTable(page = 1) {
    currentPage = Math.max(1, page);
    const rangeStart = (currentPage - 1) * pageSize;
    const rangeEnd = rangeStart + pageSize - 1;

    if (lblRangeCurrent) {
      lblRangeCurrent.textContent = `${rangeStart}-${rangeEnd}`;
    }

    resMainTable.innerHTML = '<div class="empty-state">⏳ Cargando registros desde Supabase...</div>';

    try {
      const result = await CapacitacionesEndpoints.getAllPaginated(rangeStart, rangeEnd);

      // Parsear content-range ej: "0-9/42" o "0-4/5" o "*/0"
      if (result.contentRange) {
        const parts = result.contentRange.split('/');
        if (parts.length === 2 && parts[1] !== '*') {
          totalRecords = parseInt(parts[1], 10);
        }
      }

      if (result.ok && Array.isArray(result.data)) {
        const crudTableHtml = UI.renderCrudTable(result.data);
        UI.renderResult('res-main-table', result, crudTableHtml);

        // Actualizar datos de paginación
        const rowsCount = result.data.length;
        const totalText = totalRecords !== null ? ` de ${totalRecords}` : '';
        if (paginationInfo) {
          if (rowsCount === 0) {
            paginationInfo.textContent = `Sin registros para la página ${currentPage}`;
          } else {
            paginationInfo.textContent = `Mostrando filas ${rangeStart} - ${rangeStart + rowsCount - 1}${totalText}`;
          }
        }
        if (lblPageCurrent) {
          lblPageCurrent.textContent = `Pág. ${currentPage}`;
        }

        // Estado de botones de paginación
        btnPageFirst.disabled = currentPage === 1;
        btnPagePrev.disabled = currentPage === 1;
        if (totalRecords !== null) {
          btnPageNext.disabled = rangeEnd >= totalRecords - 1;
        } else {
          btnPageNext.disabled = rowsCount < pageSize;
        }

        // Vincular eventos a los botones de acción generados en cada fila
        attachRowActionEvents();
      } else {
        UI.renderResult('res-main-table', result, '<div class="empty-state">No fue posible cargar los registros.</div>');
      }
    } catch (err) {
      UI.renderError('res-main-table', err);
      UI.showToast('Error de red al cargar la tabla principal', 'error');
    }
  }

  function attachRowActionEvents() {
    // Botones Editar por fila
    resMainTable.querySelectorAll('.btn-edit-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const rawJson = btn.getAttribute('data-row');
        try {
          const rowData = JSON.parse(decodeURIComponent(rawJson));
          openEditModal(rowData);
        } catch {
          const rowId = btn.getAttribute('data-id');
          openEditModal({ id: rowId });
        }
      });
    });

    // Botones Eliminar por fila
    resMainTable.querySelectorAll('.btn-del-row').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rowId = btn.getAttribute('data-id');
        if (!rowId) {
          UI.showToast('No se identificó el ID de la fila a eliminar', 'error');
          return;
        }

        const confirmed = window.confirm(`¿Estás seguro de eliminar permanentemente la capacitación con ID: ${rowId}?`);
        if (!confirmed) return;

        UI.setLoading(btn, true, 'Eliminando...');
        try {
          const result = await CapacitacionesEndpoints.deleteByFilter({
            column: 'id',
            operator: 'eq',
            value: rowId,
          });

          if (result.ok) {
            UI.showToast(`Capacitación #${rowId} eliminada correctamente`, 'success');
            await loadPaginatedTable(currentPage);
          } else {
            UI.showToast(`Error al eliminar: ${result.status} ${result.statusText}`, 'error');
          }
        } catch (err) {
          UI.showToast(`Error de red al eliminar: ${err.message}`, 'error');
        } finally {
          UI.setLoading(btn, false);
        }
      });
    });
  }

  // Eventos de controles de paginación
  if (btnPageFirst) btnPageFirst.addEventListener('click', () => loadPaginatedTable(1));
  if (btnPagePrev) btnPagePrev.addEventListener('click', () => loadPaginatedTable(currentPage - 1));
  if (btnPageNext) btnPageNext.addEventListener('click', () => loadPaginatedTable(currentPage + 1));
  if (btnRefreshTable) btnRefreshTable.addEventListener('click', () => loadPaginatedTable(currentPage));

  if (selectPageSize) {
    selectPageSize.addEventListener('change', () => {
      pageSize = parseInt(selectPageSize.value, 10) || 10;
      loadPaginatedTable(1);
    });
  }

  // Carga inicial de la tabla al abrir la página
  loadPaginatedTable(1);

  // =========================================================================
  // 3. MODAL: INSERTAR NUEVA CAPACITACIÓN (Antes de la tabla)
  // =========================================================================
  const modalInsert = document.getElementById('modal-insert');
  const btnOpenInsertModal = document.getElementById('btn-open-insert-modal');
  const btnCloseInsertModal = document.getElementById('btn-close-insert-modal');
  const btnCancelInsertModal = document.getElementById('btn-cancel-insert-modal');
  const formModalInsert = document.getElementById('form-modal-insert');
  const modalInsertExtraFields = document.getElementById('modal-insert-extra-fields');
  const btnAddModalInsertField = document.getElementById('btn-add-modal-insert-field');

  function openInsertModal() {
    formModalInsert.reset();
    modalInsertExtraFields.innerHTML = '';
    modalInsert.classList.remove('hidden');
    document.getElementById('modal-insert-titulo').focus();
  }

  function closeInsertModal() {
    modalInsert.classList.add('hidden');
  }

  if (btnOpenInsertModal) btnOpenInsertModal.addEventListener('click', openInsertModal);
  if (btnCloseInsertModal) btnCloseInsertModal.addEventListener('click', closeInsertModal);
  if (btnCancelInsertModal) btnCancelInsertModal.addEventListener('click', closeInsertModal);

  modalInsert.addEventListener('click', e => {
    if (e.target === modalInsert) closeInsertModal();
  });

  if (btnAddModalInsertField) {
    btnAddModalInsertField.addEventListener('click', () => createKvRow(modalInsertExtraFields));
  }

  formModalInsert.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formModalInsert.querySelector('button[type="submit"]');
    UI.setLoading(btn, true, 'Guardando...');

    const payload = {
      titulo: document.getElementById('modal-insert-titulo').value.trim(),
      descripcion: document.getElementById('modal-insert-descripcion').value.trim(),
      ...collectExtraFields(modalInsertExtraFields),
    };

    try {
      const result = await CapacitacionesEndpoints.insertMinimal(payload);
      if (result.ok) {
        UI.showToast('¡Capacitación insertada exitosamente!', 'success');
        closeInsertModal();
        await loadPaginatedTable(1);
      } else {
        UI.showToast(`Error al insertar: ${result.status} ${result.statusText}`, 'error');
      }
    } catch (err) {
      UI.showToast(`Error de red al insertar: ${err.message}`, 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // =========================================================================
  // 4. MODAL: EDITAR CAPACITACIÓN (PATCH)
  // =========================================================================
  const modalEdit = document.getElementById('modal-edit');
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');
  const formModalEdit = document.getElementById('form-modal-edit');
  const modalEditIdBadge = document.getElementById('modal-edit-id-badge');
  const modalEditId = document.getElementById('modal-edit-id');
  const modalEditTitulo = document.getElementById('modal-edit-titulo');
  const modalEditDescripcion = document.getElementById('modal-edit-descripcion');
  const modalEditExtraFields = document.getElementById('modal-edit-extra-fields');
  const btnAddModalEditField = document.getElementById('btn-add-modal-edit-field');

  function openEditModal(rowData) {
    const id = rowData.id ?? rowData.ID ?? '';
    modalEditId.value = id;
    modalEditIdBadge.textContent = id ? `#${id}` : '';
    modalEditTitulo.value = rowData.titulo || '';
    modalEditDescripcion.value = rowData.descripcion || '';
    modalEditExtraFields.innerHTML = '';

    // Llenar campos adicionales si existen en la fila
    const knownKeys = ['id', 'ID', 'titulo', 'descripcion'];
    Object.keys(rowData).forEach(k => {
      if (!knownKeys.includes(k) && rowData[k] !== undefined) {
        const row = document.createElement('div');
        row.className = 'kv-row';
        row.innerHTML = `
          <input type="text" class="kv-key" value="${UI.escapeHtml(k)}" />
          <input type="text" class="kv-val" value="${UI.escapeHtml(String(rowData[k]))}" />
          <button type="button" class="btn-icon-remove" title="Quitar campo">✕</button>
        `;
        row.querySelector('.btn-icon-remove').addEventListener('click', () => row.remove());
        modalEditExtraFields.appendChild(row);
      }
    });

    modalEdit.classList.remove('hidden');
    modalEditTitulo.focus();
  }

  function closeEditModal() {
    modalEdit.classList.add('hidden');
  }

  if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', closeEditModal);
  if (btnCancelEditModal) btnCancelEditModal.addEventListener('click', closeEditModal);

  modalEdit.addEventListener('click', e => {
    if (e.target === modalEdit) closeEditModal();
  });

  if (btnAddModalEditField) {
    btnAddModalEditField.addEventListener('click', () => createKvRow(modalEditExtraFields));
  }

  formModalEdit.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formModalEdit.querySelector('button[type="submit"]');
    UI.setLoading(btn, true, 'Actualizando...');

    const id = modalEditId.value;
    const payload = {
      titulo: modalEditTitulo.value.trim(),
      descripcion: modalEditDescripcion.value.trim(),
      ...collectExtraFields(modalEditExtraFields),
    };

    try {
      const result = await CapacitacionesEndpoints.patchRecord({
        column: 'id',
        value: id,
        payload,
      });

      if (result.ok) {
        UI.showToast(`Capacitación #${id} actualizada (PATCH) correctamente`, 'success');
        closeEditModal();
        await loadPaginatedTable(currentPage);
      } else {
        UI.showToast(`Error al actualizar: ${result.status} ${result.statusText}`, 'error');
      }
    } catch (err) {
      UI.showToast(`Error de red al actualizar: ${err.message}`, 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // =========================================================================
  // ENDPOINT 1: GET ?select=id
  // =========================================================================
  const formSelectId = document.getElementById('form-select-id');
  formSelectId.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formSelectId.querySelector('button[type="submit"]');
    UI.setLoading(btn, true);
    try {
      const result = await CapacitacionesEndpoints.getIds();
      const visual = result.ok ? UI.renderPills(result.data, 'id') : '';
      UI.renderResult('res-select-id', result, visual);
      UI.showToast(result.ok ? 'IDs cargados correctamente' : `Error ${result.status}`, result.ok ? 'success' : 'error');
    } catch (err) {
      UI.renderError('res-select-id', err);
      UI.showToast('Error de red al consultar IDs', 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // =========================================================================
  // ENDPOINT 2: GET ?select=titulo
  // =========================================================================
  const formSelectTitulo = document.getElementById('form-select-titulo');
  formSelectTitulo.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formSelectTitulo.querySelector('button[type="submit"]');
    UI.setLoading(btn, true);
    try {
      const result = await CapacitacionesEndpoints.getTitulos();
      const visual = result.ok ? UI.renderCards(result.data, 'titulo', '📘') : '';
      UI.renderResult('res-select-titulo', result, visual);
      UI.showToast(result.ok ? 'Títulos cargados correctamente' : `Error ${result.status}`, result.ok ? 'success' : 'error');
    } catch (err) {
      UI.renderError('res-select-titulo', err);
      UI.showToast('Error de red al consultar títulos', 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // =========================================================================
  // ENDPOINT 3: GET ?select=descripcion
  // =========================================================================
  const formSelectDesc = document.getElementById('form-select-descripcion');
  formSelectDesc.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formSelectDesc.querySelector('button[type="submit"]');
    UI.setLoading(btn, true);
    try {
      const result = await CapacitacionesEndpoints.getDescripciones();
      const visual = result.ok ? UI.renderCards(result.data, 'descripcion', '📝') : '';
      UI.renderResult('res-select-descripcion', result, visual);
      UI.showToast(
        result.ok ? 'Descripciones cargadas correctamente' : `Error ${result.status}`,
        result.ok ? 'success' : 'error'
      );
    } catch (err) {
      UI.renderError('res-select-descripcion', err);
      UI.showToast('Error de red al consultar descripciones', 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // =========================================================================
  // ENDPOINT 4: GET ?select=*
  // =========================================================================
  const formSelectAll = document.getElementById('form-select-all');
  formSelectAll.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formSelectAll.querySelector('button[type="submit"]');
    UI.setLoading(btn, true);
    try {
      const result = await CapacitacionesEndpoints.getAll();
      const visual = result.ok ? UI.renderTable(result.data) : '';
      UI.renderResult('res-select-all', result, visual);
      UI.showToast(
        result.ok ? `Registros obtenidos (${Array.isArray(result.data) ? result.data.length : 0})` : `Error ${result.status}`,
        result.ok ? 'success' : 'error'
      );
    } catch (err) {
      UI.renderError('res-select-all', err);
      UI.showToast('Error de red al consultar todos los registros', 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // Botón global: Ejecutar todos los GET simples y refrescar tabla
  const btnRunAllGets = document.getElementById('btn-run-all-gets');
  if (btnRunAllGets) {
    btnRunAllGets.addEventListener('click', () => {
      formSelectId.requestSubmit();
      formSelectTitulo.requestSubmit();
      formSelectDesc.requestSubmit();
      formSelectAll.requestSubmit();
      loadPaginatedTable(currentPage);
    });
  }

  // =========================================================================
  // ENDPOINT 5: GET con Range y Filtros Avanzados
  // =========================================================================
  const filtersList = document.getElementById('filters-list');
  const btnAddFilter = document.getElementById('btn-add-filter');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const formFilters = document.getElementById('form-filters');

  function createFilterRow(defaultCol = '', defaultOp = 'eq', defaultVal = '') {
    const row = document.createElement('div');
    row.className = 'filter-row';
    row.innerHTML = `
      <input type="text" class="flt-col" placeholder="Columna (ej. titulo)" value="${UI.escapeHtml(defaultCol)}" />
      <select class="flt-op">
        <option value="eq" ${defaultOp === 'eq' ? 'selected' : ''}>eq (Igual a)</option>
        <option value="neq" ${defaultOp === 'neq' ? 'selected' : ''}>neq (Diferente)</option>
        <option value="gt" ${defaultOp === 'gt' ? 'selected' : ''}>gt (Mayor que)</option>
        <option value="lt" ${defaultOp === 'lt' ? 'selected' : ''}>lt (Menor que)</option>
        <option value="gte" ${defaultOp === 'gte' ? 'selected' : ''}>gte (Mayor o igual)</option>
        <option value="lte" ${defaultOp === 'lte' ? 'selected' : ''}>lte (Menor o igual)</option>
        <option value="like" ${defaultOp === 'like' ? 'selected' : ''}>like (*Sensible*)</option>
        <option value="ilike" ${defaultOp === 'ilike' ? 'selected' : ''}>ilike (*Insensible*)</option>
        <option value="is" ${defaultOp === 'is' ? 'selected' : ''}>is (null / not.null)</option>
        <option value="in" ${defaultOp === 'in' ? 'selected' : ''}>in ((a,b,c))</option>
        <option value="cs" ${defaultOp === 'cs' ? 'selected' : ''}>cs (Array contiene {a,b})</option>
        <option value="cd" ${defaultOp === 'cd' ? 'selected' : ''}>cd (Contenido en {a,b})</option>
        <option value="not.like" ${defaultOp === 'not.like' ? 'selected' : ''}>not.like (Negar like)</option>
      </select>
      <input type="text" class="flt-val" placeholder="Valor (ej. *API*)" value="${UI.escapeHtml(defaultVal)}" />
      <button type="button" class="btn-icon-remove" title="Quitar filtro">✕</button>
    `;
    row.querySelector('.btn-icon-remove').addEventListener('click', () => row.remove());
    filtersList.appendChild(row);
  }

  if (btnAddFilter) btnAddFilter.addEventListener('click', () => createFilterRow());

  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      document.getElementById('flt-range-start').value = '0';
      document.getElementById('flt-range-end').value = '9';
      document.getElementById('flt-select').value = '*';
      document.getElementById('flt-or').value = '';
      filtersList.innerHTML = '';
    });
  }

  formFilters.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formFilters.querySelector('button[type="submit"]');
    UI.setLoading(btn, true);

    const rangeStart = document.getElementById('flt-range-start').value.trim();
    const rangeEnd = document.getElementById('flt-range-end').value.trim();
    const select = document.getElementById('flt-select').value.trim() || '*';
    const orFilter = document.getElementById('flt-or').value.trim();

    const filters = Array.from(filtersList.querySelectorAll('.filter-row'))
      .map(row => ({
        column: row.querySelector('.flt-col').value,
        operator: row.querySelector('.flt-op').value,
        value: row.querySelector('.flt-val').value,
      }))
      .filter(f => f.column.trim() !== '');

    try {
      const result = await CapacitacionesEndpoints.getFiltered({
        rangeStart,
        rangeEnd,
        select,
        filters,
        orFilter,
      });
      const visual = result.ok ? UI.renderTable(result.data) : '';
      UI.renderResult('res-filters', result, visual);
      UI.showToast(result.ok ? 'Consulta filtrada ejecutada' : `Error ${result.status}`, result.ok ? 'success' : 'error');
    } catch (err) {
      UI.renderError('res-filters', err);
      UI.showToast('Error al ejecutar la consulta filtrada', 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // =========================================================================
  // ENDPOINT 6: POST Insertar (Prefer: return=minimal)
  // =========================================================================
  const formPostMin = document.getElementById('form-post-minimal');
  const postMinExtraContainer = document.getElementById('post-min-extra-fields');
  const btnAddPostMinField = document.getElementById('btn-add-post-min-field');
  if (btnAddPostMinField) {
    btnAddPostMinField.addEventListener('click', () => createKvRow(postMinExtraContainer));
  }

  formPostMin.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formPostMin.querySelector('button[type="submit"]');
    UI.setLoading(btn, true, 'Insertando...');

    const payload = {
      titulo: document.getElementById('post-min-titulo').value.trim(),
      descripcion: document.getElementById('post-min-descripcion').value.trim(),
      ...collectExtraFields(postMinExtraContainer),
    };

    try {
      const result = await CapacitacionesEndpoints.insertMinimal(payload);
      const msgHtml = result.ok
        ? '<div class="mini-card">✅ Registro insertado correctamente (<code>Prefer: return=minimal</code>).</div>'
        : '';
      UI.renderResult('res-post-minimal', result, msgHtml);
      UI.showToast(result.ok ? 'Capacitación insertada' : `Error ${result.status}`, result.ok ? 'success' : 'error');
      if (result.ok) loadPaginatedTable(currentPage);
    } catch (err) {
      UI.renderError('res-post-minimal', err);
      UI.showToast('Error al insertar capacitación', 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // =========================================================================
  // ENDPOINT 7: POST Upsert (Prefer: resolution=merge-duplicates)
  // =========================================================================
  const formPostUpsert = document.getElementById('form-post-upsert');
  const upsertExtraContainer = document.getElementById('upsert-extra-fields');
  const btnAddUpsertField = document.getElementById('btn-add-upsert-field');
  if (btnAddUpsertField) {
    btnAddUpsertField.addEventListener('click', () => createKvRow(upsertExtraContainer));
  }

  formPostUpsert.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formPostUpsert.querySelector('button[type="submit"]');
    UI.setLoading(btn, true, 'Procesando Upsert...');

    const idRaw = document.getElementById('upsert-id').value.trim();
    const payload = {
      titulo: document.getElementById('upsert-titulo').value.trim(),
      descripcion: document.getElementById('upsert-descripcion').value.trim(),
      ...collectExtraFields(upsertExtraContainer),
    };

    if (idRaw !== '') {
      payload.id = !Number.isNaN(Number(idRaw)) ? Number(idRaw) : idRaw;
    }

    try {
      const result = await CapacitacionesEndpoints.upsertMergeDuplicates(payload);
      const visual = result.ok && Array.isArray(result.data) ? UI.renderTable(result.data) : '';
      UI.renderResult('res-post-upsert', result, visual);
      UI.showToast(result.ok ? 'Upsert completado' : `Error ${result.status}`, result.ok ? 'success' : 'error');
      if (result.ok) loadPaginatedTable(currentPage);
    } catch (err) {
      UI.renderError('res-post-upsert', err);
      UI.showToast('Error al ejecutar upsert', 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // =========================================================================
  // ENDPOINT 8: PATCH Formulario Individual
  // =========================================================================
  const formPatch = document.getElementById('form-patch');
  const patchExtraFields = document.getElementById('patch-extra-fields');
  const btnAddPatchField = document.getElementById('btn-add-patch-field');
  if (btnAddPatchField) {
    btnAddPatchField.addEventListener('click', () => createKvRow(patchExtraFields));
  }

  formPatch.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formPatch.querySelector('button[type="submit"]');
    UI.setLoading(btn, true, 'Actualizando...');

    const column = document.getElementById('patch-col-filter').value.trim();
    const value = document.getElementById('patch-val-filter').value.trim();
    const titulo = document.getElementById('patch-titulo').value.trim();
    const descripcion = document.getElementById('patch-descripcion').value.trim();

    const payload = {
      ...collectExtraFields(patchExtraFields),
    };
    if (titulo) payload.titulo = titulo;
    if (descripcion) payload.descripcion = descripcion;

    if (Object.keys(payload).length === 0) {
      UI.showToast('Debes ingresar al menos un campo para actualizar', 'error');
      UI.setLoading(btn, false);
      return;
    }

    try {
      const result = await CapacitacionesEndpoints.patchRecord({
        column,
        value,
        payload,
      });

      const msgHtml = result.ok
        ? '<div class="mini-card">✅ Registro actualizado vía PATCH (<code>Prefer: return=minimal</code>).</div>'
        : '';
      UI.renderResult('res-patch', result, msgHtml);
      UI.showToast(result.ok ? 'Registro actualizado (PATCH)' : `Error ${result.status}`, result.ok ? 'success' : 'error');
      if (result.ok) loadPaginatedTable(currentPage);
    } catch (err) {
      UI.renderError('res-patch', err);
      UI.showToast('Error al ejecutar PATCH', 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // =========================================================================
  // ENDPOINT 9: DELETE Formulario Individual
  // =========================================================================
  const formDelete = document.getElementById('form-delete');
  formDelete.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = formDelete.querySelector('button[type="submit"]');
    UI.setLoading(btn, true, 'Eliminando...');

    const column = document.getElementById('del-column').value;
    const operator = document.getElementById('del-operator').value;
    const value = document.getElementById('del-value').value;

    try {
      const result = await CapacitacionesEndpoints.deleteByFilter({ column, operator, value });
      const visual =
        result.ok && Array.isArray(result.data)
          ? UI.renderTable(result.data)
          : result.ok
            ? '<div class="mini-card">🗑️ Operación DELETE ejecutada con éxito.</div>'
            : '';
      UI.renderResult('res-delete', result, visual);
      UI.showToast(result.ok ? 'Registro(s) eliminado(s)' : `Error ${result.status}`, result.ok ? 'success' : 'error');
      document.getElementById('del-confirm').checked = false;
      if (result.ok) loadPaginatedTable(currentPage);
    } catch (err) {
      UI.renderError('res-delete', err);
      UI.showToast('Error al eliminar registro', 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });
});
