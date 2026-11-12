/**
 * Helpers de renderizado visual y manipulación de interfaz (DOM).
 */
const UI = {
  escapeHtml(str) {
    if (typeof str !== 'string') {
      if (str === null || str === undefined) return '';
      return String(str);
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  },

  setLoading(button, isLoading, loadingText = 'Ejecutando...') {
    if (!button) return;
    const label = button.querySelector('.btn-label') || button;
    if (isLoading) {
      button.disabled = true;
      button.dataset.origText = label.textContent;
      label.textContent = loadingText;
      const pill = document.getElementById('global-status');
      if (pill) {
        pill.textContent = 'Enviando petición...';
        pill.classList.add('loading');
      }
    } else {
      button.disabled = false;
      if (button.dataset.origText) {
        label.textContent = button.dataset.origText;
      }
      const pill = document.getElementById('global-status');
      if (pill) {
        pill.textContent = 'Listo';
        pill.classList.remove('loading');
      }
    }
  },

  renderMeta(result) {
    const statusClass = result.ok ? 'ok' : 'err';
    const rangeInfo = result.contentRange ? ` · Content-Range: ${this.escapeHtml(result.contentRange)}` : '';
    return `
      <div class="meta-bar">
        <div class="meta-badges">
          <span class="http-badge ${statusClass}">${result.method} ${result.status} ${this.escapeHtml(result.statusText || '')}</span>
          <span>⏱ ${result.durationMs}ms</span>
          <span>${rangeInfo}</span>
        </div>
        <div class="meta-url" title="${this.escapeHtml(result.url)}">${this.escapeHtml(result.url)}</div>
      </div>
    `;
  },

  renderJsonDetails(data, rawText) {
    let formatted;
    if (typeof data === 'object' && data !== null) {
      formatted = JSON.stringify(data, null, 2);
    } else {
      formatted = rawText || '(Respuesta vacía o minimal)';
    }

    return `
      <details class="json-details">
        <summary>Ver Payload JSON / Respuesta del Servidor</summary>
        <pre class="json-pre"><code>${this.escapeHtml(formatted)}</code></pre>
      </details>
    `;
  },

  renderTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '<div class="empty-state">No se devolvieron registros para esta consulta.</div>';
    }

    const headers = Object.keys(rows[0]);
    if (headers.length === 0) {
      return '<div class="empty-state">Objetos sin campos.</div>';
    }

    const ths = headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('');
    const trs = rows
      .map(row => {
        const tds = headers
          .map(h => {
            const val = row[h];
            const renderedVal =
              typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
            return `<td>${this.escapeHtml(renderedVal)}</td>`;
          })
          .join('');
        return `<tr>${tds}</tr>`;
      })
      .join('');

    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>
    `;
  },

  /**
   * Renderiza la tabla interactiva de gestión principal con acciones (Editar y Eliminar) por fila
   */
  renderCrudTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '<div class="empty-state">No hay capacitaciones registradas en este rango.</div>';
    }

    // Identificar columnas comunes priorizando id, titulo, descripcion
    const allKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    const prioritized = ['id', 'titulo', 'descripcion'];
    const restKeys = allKeys.filter(k => !prioritized.includes(k));
    const sortedHeaders = [...prioritized.filter(k => allKeys.includes(k)), ...restKeys];

    const ths = sortedHeaders.map(h => {
      const isId = h.toLowerCase() === 'id';
      const className = isId ? ' class="col-id"' : '';
      return `<th${className}>${this.escapeHtml(h.toUpperCase())}</th>`;
    }).join('');

    const trs = rows
      .map((row, idx) => {
        const idVal = row.id ?? row.ID ?? '';
        const dataJson = encodeURIComponent(JSON.stringify(row));

        const tds = sortedHeaders
          .map(h => {
            const val = row[h];
            const isId = h.toLowerCase() === 'id';
            const className = isId ? ' class="col-id"' : '';
            let cellContent = '';

            if (isId) {
              cellContent = `<span class="data-pill">#${this.escapeHtml(String(val ?? ''))}</span>`;
            } else if (h === 'titulo') {
              cellContent = `<strong>${this.escapeHtml(String(val ?? ''))}</strong>`;
            } else if (typeof val === 'object' && val !== null) {
              cellContent = `<code>${this.escapeHtml(JSON.stringify(val))}</code>`;
            } else {
              cellContent = this.escapeHtml(String(val ?? ''));
            }

            return `<td${className}>${cellContent}</td>`;
          })
          .join('');

        const actions = `
          <td class="table-actions-cell">
            <button type="button" class="btn btn-action-edit btn-sm btn-edit-row" data-id="${this.escapeHtml(String(idVal))}" data-row="${dataJson}" title="Editar esta capacitación (PATCH)">
              ✏️ Editar
            </button>
            <button type="button" class="btn btn-action-delete btn-sm btn-del-row" data-id="${this.escapeHtml(String(idVal))}" title="Eliminar capacitación (DELETE)">
              🗑️ Eliminar
            </button>
          </td>
        `;

        return `<tr>${tds}${actions}</tr>`;
      })
      .join('');

    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              ${ths}
              <th style="text-align: right; min-width: 170px;">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            ${trs}
          </tbody>
        </table>
      </div>
    `;
  },

  renderPills(rows, key) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '<div class="empty-state">No hay registros disponibles.</div>';
    }
    const pills = rows
      .map(r => {
        const val = r && r[key] !== undefined ? r[key] : '(vacío)';
        return `<span class="data-pill"><strong>#</strong> ${this.escapeHtml(String(val))}</span>`;
      })
      .join('');
    return `<div class="pill-grid">${pills}</div>`;
  },

  renderCards(rows, key, icon = '📝') {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '<div class="empty-state">No hay registros disponibles.</div>';
    }
    const cards = rows
      .map(r => {
        const val = r && r[key] !== undefined ? r[key] : '(vacío)';
        return `<div class="mini-card"><span aria-hidden="true">${icon}</span> ${this.escapeHtml(String(val))}</div>`;
      })
      .join('');
    return `<div class="list-cards">${cards}</div>`;
  },

  renderResult(containerId, result, customHtml = '') {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = `
      ${this.renderMeta(result)}
      ${customHtml}
      ${this.renderJsonDetails(result.data, result.rawText)}
    `;
  },

  renderError(containerId, error) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="meta-bar">
        <span class="http-badge err">ERROR</span>
        <span>Falló la comunicación con el servidor</span>
      </div>
      <p style="color: var(--accent-delete); margin: 0.5rem 0; font-size: 0.88rem;">
        ${this.escapeHtml(error.message || String(error))}
      </p>
    `;
  },

  clearResult(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div class="empty-state">Resultado limpiado.</div>';
  },
};
