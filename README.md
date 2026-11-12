# Capacitaciones API Studio — Frontend Nativo (CRUD + Paginación)

Frontend web moderno, elegante y modular construido exclusivamente con **HTML5, CSS3 y JavaScript nativo (`fetch`)**, diseñado para interactuar de forma completa con la tabla `capacitaciones` alojada en Supabase (PostgREST).

---

## 🚀 Nuevas Funcionalidades y Estructura

- **Tabla Principal con Paginación Reactiva**:
  - Paginada por defecto con **10 filas** (`Range: 0-9`, `Range: 10-19`, etc.) usando el encabezado HTTP `Range` y obteniendo el conteo total con `Prefer: count=exact`.
  - Selector dinámico de tamaño de página (5, 10, 20, 50 filas).
  - Navegación entre páginas: Primera «, Anterior ‹, Indicador de página y Siguiente ›.
- **Botón "➕ Insertar Nueva Capacitación" antes de la tabla**:
  - Abre un modal flotante elegante para registrar nuevas capacitaciones mediante `POST` con `Prefer: return=minimal`.
  - Permite añadir campos personalizados clave/valor.
  - Al completar la inserción, refresca automáticamente la tabla en la página 1.
- **Acciones por Fila en la Tabla**:
  - **Botón ✏️ Editar (PATCH)**: Abre un modal de edición cargado con los datos del registro y ejecuta `PATCH /rest/v1/capacitaciones?id=eq.<id>` enviando los cambios con `Prefer: return=minimal`.
  - **Botón 🗑️ Eliminar (DELETE)**: Solicita confirmación y ejecuta `DELETE /rest/v1/capacitaciones?id=eq.<id>`, refrescando inmediatamente la tabla.
- **Módulos Individuales Conservados**:
  - Sección independiente para probar cada endpoint curl individualmente (`?select=id`, `?select=titulo`, `?select=descripcion`, `?select=*`, filtros avanzados, upsert y patch manual).

---

## 📁 Archivos del Proyecto

- [`index.html`](file:///home/diegolegarda/Documentos/cursoSENA/Testing/frontAPI/index.html): Estructura semántica, tabla principal, modales y tarjetas por endpoint.
- [`css/styles.css`](file:///home/diegolegarda/Documentos/cursoSENA/Testing/frontAPI/css/styles.css): Diseño Dark Studio, estilos para la tabla interactiva, botones de acción, modales y paginación.
- [`js/config.js`](file:///home/diegolegarda/Documentos/cursoSENA/Testing/frontAPI/js/config.js): Base URL y credenciales de autenticación (`apikey` y `Bearer`).
- [`js/endpoints.js`](file:///home/diegolegarda/Documentos/cursoSENA/Testing/frontAPI/js/endpoints.js): Funciones `fetch()` nativas para `getAllPaginated`, `patchRecord`, `insertMinimal`, `deleteByFilter`, etc.
- [`js/ui.js`](file:///home/diegolegarda/Documentos/cursoSENA/Testing/frontAPI/js/ui.js): Renderizado de la tabla CRUD con acciones, toasts y visor JSON.
- [`js/app.js`](file:///home/diegolegarda/Documentos/cursoSENA/Testing/frontAPI/js/app.js): Control de paginación, eventos de filas, apertura de modales y recarga de datos.

---

## 💻 Ejecución

Abre directamente en el navegador el archivo [`index.html`](file:///home/diegolegarda/Documentos/cursoSENA/Testing/frontAPI/index.html) o inicia un servidor HTTP:
```bash
python3 -m http.server 8080
```
Y visita `http://localhost:8080`.
