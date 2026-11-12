/**
 * Capa de consumo de API: cada endpoint está separado en su propia función nativa con fetch().
 */
const CapacitacionesEndpoints = {
  /**
   * 1. GET /rest/v1/capacitaciones?select=id
   */
  async getIds() {
    const url = `${ApiConfig.getBaseUrl()}?select=id`;
    return executeFetch(url, {
      method: 'GET',
      headers: ApiConfig.getBaseHeaders(),
    });
  },

  /**
   * 2. GET /rest/v1/capacitaciones?select=titulo
   */
  async getTitulos() {
    const url = `${ApiConfig.getBaseUrl()}?select=titulo`;
    return executeFetch(url, {
      method: 'GET',
      headers: ApiConfig.getBaseHeaders(),
    });
  },

  /**
   * 3. GET /rest/v1/capacitaciones?select=descripcion
   */
  async getDescripciones() {
    const url = `${ApiConfig.getBaseUrl()}?select=descripcion`;
    return executeFetch(url, {
      method: 'GET',
      headers: ApiConfig.getBaseHeaders(),
    });
  },

  /**
   * 4. GET /rest/v1/capacitaciones?select=*
   */
  async getAll() {
    const url = `${ApiConfig.getBaseUrl()}?select=*`;
    return executeFetch(url, {
      method: 'GET',
      headers: ApiConfig.getBaseHeaders(),
    });
  },

  /**
   * 4.1 GET /rest/v1/capacitaciones?select=* con Range (Paginación)
   * curl 'https://.../rest/v1/capacitaciones?select=*' -H "Range: 0-9"
   * Además solicita el conteo total exacto mediante Prefer: count=exact
   * @param {number} rangeStart
   * @param {number} rangeEnd
   */
  async getAllPaginated(rangeStart = 0, rangeEnd = 9) {
    const url = `${ApiConfig.getBaseUrl()}?select=*`;
    const headers = ApiConfig.getBaseHeaders({
      Range: `${rangeStart}-${rangeEnd}`,
      Prefer: 'count=exact',
    });

    return executeFetch(url, {
      method: 'GET',
      headers,
    });
  },

  /**
   * 5. GET /rest/v1/capacitaciones con Range, select, filtros y operador or
   * @param {Object} params
   * @param {string|number} params.rangeStart
   * @param {string|number} params.rangeEnd
   * @param {string} params.select
   * @param {Array<{column: string, operator: string, value: string}>} params.filters
   * @param {string} params.orFilter
   */
  async getFiltered({ rangeStart, rangeEnd, select = '*', filters = [], orFilter = '' }) {
    const queryParts = [`select=${encodeURIComponent(select || '*')}`];

    filters.forEach(({ column, operator, value }) => {
      const col = column.trim();
      const op = operator.trim();
      const val = value.trim();
      if (!col || !op) return;

      if (op === 'is') {
        queryParts.push(`${encodeURIComponent(col)}=is.${encodeURIComponent(val || 'null')}`);
      } else if (op === 'in') {
        const formatted = val.startsWith('(') ? val : `(${val})`;
        queryParts.push(`${encodeURIComponent(col)}=in.${formatted}`);
      } else if (op === 'cs' || op === 'cd') {
        const formatted = val.startsWith('{') ? val : `{${val}}`;
        queryParts.push(`${encodeURIComponent(col)}=${op}.${formatted}`);
      } else {
        queryParts.push(`${encodeURIComponent(col)}=${op}.${encodeURIComponent(val)}`);
      }
    });

    if (orFilter && orFilter.trim()) {
      const rawOr = orFilter.trim();
      const formattedOr = rawOr.startsWith('(') ? rawOr : `(${rawOr})`;
      queryParts.push(`or=${formattedOr}`);
    }

    const url = `${ApiConfig.getBaseUrl()}?${queryParts.join('&')}`;
    const headers = ApiConfig.getBaseHeaders();

    if (rangeStart !== '' && rangeEnd !== '') {
      headers.Range = `${rangeStart}-${rangeEnd}`;
      headers.Prefer = 'count=exact';
    }

    return executeFetch(url, {
      method: 'GET',
      headers,
    });
  },

  /**
   * 6. POST /rest/v1/capacitaciones (Prefer: return=minimal)
   * @param {Object} payload
   */
  async insertMinimal(payload) {
    const url = ApiConfig.getBaseUrl();
    return executeFetch(url, {
      method: 'POST',
      headers: ApiConfig.getBaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify(payload),
    });
  },

  /**
   * 7. POST /rest/v1/capacitaciones (Prefer: resolution=merge-duplicates)
   * @param {Object} payload
   */
  async upsertMergeDuplicates(payload) {
    const url = ApiConfig.getBaseUrl();
    return executeFetch(url, {
      method: 'POST',
      headers: ApiConfig.getBaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(payload),
    });
  },

  /**
   * 8. PATCH /rest/v1/capacitaciones?column=eq.value
   * Actualiza uno o varios campos en registros que cumplan el filtro
   * @param {Object} params
   * @param {string} params.column
   * @param {string|number} params.value
   * @param {Object} params.payload
   * @param {string} [params.operator='eq']
   */
  async patchRecord({ column, value, payload, operator = 'eq' }) {
    const col = encodeURIComponent(String(column).trim());
    const val = encodeURIComponent(String(value).trim());
    const url = `${ApiConfig.getBaseUrl()}?${col}=${operator}.${val}`;

    return executeFetch(url, {
      method: 'PATCH',
      headers: ApiConfig.getBaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify(payload),
    });
  },

  /**
   * 9. DELETE /rest/v1/capacitaciones?columna=operador.valor
   * @param {Object} params
   * @param {string} params.column
   * @param {string} params.operator
   * @param {string} params.value
   */
  async deleteByFilter({ column, operator = 'eq', value }) {
    const col = encodeURIComponent(column.trim());
    const val = encodeURIComponent(value.trim());
    const url = `${ApiConfig.getBaseUrl()}?${col}=${operator}.${val}`;

    return executeFetch(url, {
      method: 'DELETE',
      headers: ApiConfig.getBaseHeaders({
        Prefer: 'return=representation',
      }),
    });
  },
};
