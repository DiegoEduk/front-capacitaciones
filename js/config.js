/**
 * Configuración global de conexión a Supabase REST API.
 * Lee dinámicamente los inputs de configuración si el usuario los modifica en la UI.
 */
const ApiConfig = {
  DEFAULT_URL: 'https://frkvnjqxqlhqussxbtut.supabase.co/rest/v1/capacitaciones',
  DEFAULT_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZya3ZuanF4cWxocXVzc3hidHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0OTQ5OTEsImV4cCI6MjExMDA3MDk5MX0.y35XDvlH37TOFPIXMtT-0RF-hXf5lquJGhDRohMBdkc',

  getBaseUrl() {
    const input = document.getElementById('cfg-url');
    return (input && input.value.trim()) || this.DEFAULT_URL;
  },

  getApiKey() {
    const input = document.getElementById('cfg-apikey');
    return (input && input.value.trim()) || this.DEFAULT_KEY;
  },

  getBaseHeaders(extraHeaders = {}) {
    const key = this.getApiKey();
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...extraHeaders,
    };
  },
};

/**
 * Ejecuta una petición HTTP con fetch() nativo y devuelve un resultado normalizado
 * con tiempos de respuesta, estado HTTP y cuerpo parseado.
 */
async function executeFetch(url, options = {}) {
  const startedAt = performance.now();
  const method = (options.method || 'GET').toUpperCase();

  const response = await fetch(url, options);
  const durationMs = Math.round(performance.now() - startedAt);

  const rawText = await response.text();
  let data = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    durationMs,
    method,
    url,
    contentRange: response.headers.get('content-range'),
    data,
    rawText,
  };
}
