/**
 * Ensembles meteorológicos – Web App de Google Apps Script
 * Archivo: Code.gs
 *
 * Variables: Temp. 850 hPa (líneas) y Precipitaciones (barras).
 * Para añadir un modelo, basta con una entrada nueva en MODELOS (con sus urls por variable).
 */

// ---------------------------------------------------------------------------
// CONFIGURACIÓN
// ---------------------------------------------------------------------------
// Catálogo de variables que ofrece el selector de la web.
// disponible:false -> la web las muestra vacías (todavía sin datos).
// Cuando insertes los datos de una variable, pon disponible:true y añade
// sus URLs (por modelo) en MODELOS.
const VARIABLES = {
  // tipo: 'lineas' | 'barras'.  mediaModelo: dibuja (o no) la media de cada modelo.
  // intervalo: cada valor es el de un intervalo (p. ej. lluvia de 3 h), no una magnitud continua.
  t850:  { titulo: 'Temp. 850 hPa (°C)',      unidad: '°C',   disponible: true,  tipo: 'lineas', mediaModelo: true, clima: true },
  t500:  { titulo: 'Temp. 500 hPa (°C)',      unidad: '°C',   disponible: false, tipo: 'lineas', mediaModelo: true  },
  t2m:   { titulo: 'Temp. 2m (°C)',           unidad: '°C',   disponible: false, tipo: 'lineas', mediaModelo: true  },
  prec:  { titulo: 'Precipitaciones',         unidad: 'mm',   disponible: true,  tipo: 'lineas', mediaModelo: false, intervalo: true },
  precA: { titulo: 'Precipitaciones acumuladas', unidad: 'mm', disponible: true,  tipo: 'lineas', mediaModelo: true, acumulada: true },
  racha: { titulo: 'Rachas de viento',        unidad: 'km/h', disponible: false, tipo: 'lineas', mediaModelo: true }
};
const VARIABLE_POR_DEFECTO = 't850';

// El orden de esta lista es el orden en que se dibujan los modelos.
const MODELOS = [
  {
    id: 'GFS',
    nombre: 'GFS',
    urls: {
      t850: 'https://www.meteociel.fr/modeles/gefs_table.php?ext=1&x=&lat=41.42&lon=2.12&ville=',
      prec: 'https://www.meteociel.fr/modeles/gefs_table.php?x=0&y=0&lat=41.42&lon=2.12&ext=1&mode=3&sort=0',
      precA: 'https://www.meteociel.fr/modeles/gefs_table.php?x=0&y=0&lat=41.42&lon=2.12&ext=1&mode=23&sort=0'
    },
    color: '#4aa3ff',        // color de TODOS los ensembles (y de la línea gruesa)
    colorMedia: '#ffffff',   // color de la línea de la media del modelo
    incluirControl: true,    // columna "0" (miembro de control)
    columnaPrincipal: 'GFS'  // columna con la línea gruesa (operativo)
  },
  {
    id: 'ICON',
    nombre: 'ICON',
    // OJO: run=12 fijo, tal y como lo indicaste. sort=0 es imprescindible
    // (con otro valor Meteociel ordena los valores y los escenarios se mezclan).
    urls: {
      t850: 'https://www.meteociel.fr/modeles/icon-eu-eps_table.php?x=0&y=0&lat=41.42&lon=2.12&mode=3&sort=0',
      prec: 'https://www.meteociel.fr/modeles/icon-eu-eps_table.php?x=0&y=0&lat=41.42&lon=2.12&mode=6&sort=0',
      precA: 'https://www.meteociel.fr/modeles/icon-eu-eps_table.php?x=0&y=0&lat=41.42&lon=2.12&mode=26&sort=0'
    },
    color: '#ffd400',        // amarillo
    colorMedia: '#ff9800',   // naranja, para distinguir su media de la de GFS
    incluirControl: true,    // ICON no tiene columna 0, así que no afecta
    columnaPrincipal: null   // ICON no tiene columna de operativo
  },
  {
    id: 'AIFS',
    nombre: 'ECMWF AIFS',
    urls: {
      t850: 'https://www.meteociel.fr/modeles/ecmwfens_table.php?ext=1&x=&lat=41.42&lon=2.12&ville=&aifs=1',
      prec: 'https://www.meteociel.fr/modeles/ecmwfens_table.php?x=0&y=0&lat=41.42&lon=2.12&ext=1&mode=3&sort=0&aifs=1',
      precA: 'https://www.meteociel.fr/modeles/ecmwfens_table.php?x=0&y=0&lat=41.42&lon=2.12&ext=1&mode=13&sort=0&aifs=1'
    },
    color: '#ff3b3b',        // rojo
    colorMedia: '#ff4dd2',   // magenta, para distinguir su media de las demás
    incluirControl: true,    // columna "0" (control)
    columnaPrincipal: 'DET'  // DET = operativo del ECMWF AIFS (línea gruesa)
  },
  {
    id: 'MOGREPS',
    nombre: 'MOGREPS',
    // run=12 fijo, como lo indicaste (sort=0 imprescindible).
    // Sin URL 'prec': MOGREPS no tiene precipitaciones y no aparece en esa variable.
    urls: {
      t850: 'https://www.meteociel.fr/modeles/mogreps_table.php?x=0&y=0&lat=41.42&lon=2.12&mode=2&sort=0'
    },
    color: '#b0b0b0',        // gris
    colorMedia: '#3ddc84',   // verde, para distinguir su media de las demás
    incluirControl: true,    // (MOGREPS no tiene columna "0"; no afecta)
    columnaPrincipal: 'Ctrl',        // columna "Ctrl" -> línea gruesa
    etiquetaPrincipal: 'control',    // texto de la leyenda: "MOGREPS (control)"
    principalEnMedia: true           // el Ctrl es un miembro más: entra en la media
  },
  {
    id: 'ECMWF',
    nombre: 'ECMWF',
    urls: {
      t850: 'https://www.meteociel.fr/modeles/ecmwfens_table.php?ext=1&x=&lat=41.42&lon=2.12&ville=',
      prec: 'https://www.meteociel.fr/modeles/ecmwfens_table.php?x=0&y=0&lat=41.42&lon=2.12&ext=1&mode=3&sort=0',
      precA: 'https://www.meteociel.fr/modeles/ecmwfens_table.php?x=0&y=0&lat=41.42&lon=2.12&ext=1&mode=13&sort=0'
    },
    color: '#2ecc40',        // verde
    incluirControl: true,    // columna "0" (control)
    columnaPrincipal: 'DET'  // DET = operativo del ECMWF (línea gruesa)
  },
  {
    id: 'ARPEGE',
    nombre: 'ARPEGE',
    // ARPEGE ensemble = PEARP. run=18 fijo, como lo indicaste (sort=0 imprescindible)
    urls: {
      t850: 'https://www.meteociel.fr/modeles/pe-arpege_table.php?x=0&y=0&lat=41.42&lon=2.12&mode=5&sort=0',
      prec: 'https://www.meteociel.fr/modeles/pe-arpege_table.php?x=0&y=0&lat=41.42&lon=2.12&mode=8&sort=0',
      precA: 'https://www.meteociel.fr/modeles/pe-arpege_table.php?x=0&y=0&lat=41.42&lon=2.12&mode=7&sort=0'
    },
    color: '#ff9800',        // naranja
    incluirControl: true,    // (no tiene columna "0"; no afecta)
    columnaPrincipal: null   // sin operativo: no hay línea gruesa
  },
  {
    id: 'AROME',
    nombre: 'AROME',
    // AROME ensemble = PE-AROME. run=15 fijo, como lo indicaste (sort=0 imprescindible)
    urls: {
      t850: 'https://www.meteociel.fr/modeles/pe-arome_table.php?x=0&y=0&lat=41.42&lon=2.12&mode=7&sort=0',
      prec: 'https://www.meteociel.fr/modeles/pe-arome_table.php?x=0&y=0&lat=41.42&lon=2.12&mode=10&sort=0',
      precA: 'https://www.meteociel.fr/modeles/pe-arome_table.php?x=0&y=0&lat=41.42&lon=2.12&mode=9&sort=0'
    },
    color: '#c084fc',        // lila
    incluirControl: true,    // (no tiene columna "0"; no afecta)
    columnaPrincipal: 'Ctrl',   // columna "Ctrl" = operativo (línea gruesa)
    principalEnMedia: true      // el Ctrl es un miembro más: entra en la media (como MOGREPS)
  }
];

// ---------------------------------------------------------------------------
// WEB APP
// ---------------------------------------------------------------------------
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Ensembles meteorológicos')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Llamada desde el cliente con google.script.run.obtenerDatos()
 * Descarga TODOS los modelos (en paralelo) y devuelve sus datos.
 * Si un modelo falla, se devuelve con el campo "error" y los demás siguen.
 */
function obtenerDatos(variableId) {
  if (!VARIABLES[variableId]) variableId = VARIABLE_POR_DEFECTO;
  const variable = VARIABLES[variableId];

  // Variable sin datos todavía: respuesta vacía, sin descargar nada
  if (!variable.disponible) {
    return {
      variable: variable.titulo,
      unidad: variable.unidad,
      tipo: variable.tipo,
      mediaModelo: variable.mediaModelo,
      acumulada: !!variable.acumulada,
      intervalo: !!variable.intervalo,
      clima: !!variable.clima,
      sinDatos: true,
      actualizado: new Date().toISOString(),
      modelos: []
    };
  }

  const opciones = {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept-Language': 'fr,es;q=0.8,en;q=0.5'
    }
  };

  // Solo los modelos que tienen URL para esta variable
  const activos = MODELOS.filter(function (cfg) { return cfg.urls && cfg.urls[variableId]; });

  const peticiones = activos.map(function (cfg) {
    return Object.assign({ url: cfg.urls[variableId] }, opciones);
  });
  const respuestas = UrlFetchApp.fetchAll(peticiones);

  const modelos = activos.map(function (cfg, i) {
    const base = {
      id: cfg.id,
      nombre: cfg.nombre,
      color: cfg.color,
      colorMedia: cfg.colorMedia,
      etiquetaPrincipal: cfg.etiquetaPrincipal || 'operativo',
      principalEnMedia: !!cfg.principalEnMedia
    };
    try {
      const r = respuestas[i];
      const codigo = r.getResponseCode();
      if (codigo !== 200) throw new Error('Meteociel respondió con código HTTP ' + codigo);
      // Meteociel sirve la página en ISO-8859-1
      const datos = parsearTabla_(r.getContentText('ISO-8859-1'), cfg);
      return Object.assign(base, datos);
    } catch (e) {
      return Object.assign(base, { error: e.message });
    }
  });

  return {
    variable: variable.titulo,
    unidad: variable.unidad,
    tipo: variable.tipo,
    mediaModelo: variable.mediaModelo,
    acumulada: !!variable.acumulada,
    intervalo: !!variable.intervalo,
    clima: !!variable.clima,
    actualizado: new Date().toISOString(),
    modelos: modelos
  };
}

// ---------------------------------------------------------------------------
// PARSER DE LAS TABLAS DE METEOCIEL (sirve para GEFS e ICON-EU-EPS)
// ---------------------------------------------------------------------------
function parsearTabla_(html, cfg) {
  // 1) Extraer todas las filas <tr> (sin tablas anidadas) y sus celdas
  const filas = [];
  const reTr = /<tr[^>]*>((?:(?!<tr[\s>])[\s\S])*?)<\/tr>/gi;
  let m;
  while ((m = reTr.exec(html)) !== null) {
    const celdas = [];
    const reTd = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let c;
    while ((c = reTd.exec(m[1])) !== null) {
      celdas.push(limpiarTexto_(c[1]));
    }
    if (celdas.length) filas.push(celdas);
  }

  // 2) Fila de cabecera: "Date | Ech. | 0/1 | ... | 30/40 | GFS"
  const iCab = filas.findindex(function (f) {
    return f.length >= 4 && /^date$/i.test(f[0]) && /^ech/i.test(f[1]);
  });
  if (iCab < 0) {
    throw new Error('No se encontró la cabecera de la tabla (¿ha cambiado el formato?).');
  }
  const cabecera = filas[iCab];

  // 3) Columnas: miembros (numéricas) y, si existe, la principal
  const columnasMiembros = [];
  let colPrincipal = -1;
  for (let j = 2; j < cabecera.length; j++) {
    const etiqueta = cabecera[j];
    if (/^\d+$/.test(etiqueta)) {
      if (etiqueta === '0' && !cfg.incluirControl) continue;
      columnasMiembros.push({ idx: j, etiqueta: etiqueta });
    } else if (cfg.columnaPrincipal &&
               etiqueta.toUpperCase() === cfg.columnaPrincipal.toUpperCase()) {
      colPrincipal = j;
    }
  }
  if (!columnasMiembros.length) {
    throw new Error('No se encontraron columnas de ensembles en la tabla.');
  }

  // 4) Filas de datos: fecha con formato "2026-10-02 12Z"
  const reFecha = /^(\d{4})-(\d{2})-(\d{2}) (\d{2})Z$/;
  const fechas = [];
  const horasPrevision = [];
  const miembros = {};
  columnasMiembros.forEach(function (cm) { miembros[cm.etiqueta] = []; });
  const principal = [];

  for (let i = iCab + 1; i < filas.length; i++) {
    const f = filas[i];
    const mf = reFecha.exec(f[0]);
    if (!mf) continue;

    // Fecha en UTC, como texto sin zona (el cliente la trata como UTC)
    fechas.push(mf[1] + '-' + mf[2] + '-' + mf[3] + ' ' + mf[4] + ':00:00');
    horasPrevision.push(parseInt(f[1], 10));

    columnasMiembros.forEach(function (cm) {
      miembros[cm.etiqueta].push(aNumero_(f[cm.idx]));  // celda ausente -> null
    });
    if (colPrincipal >= 0) principal.push(aNumero_(f[colPrincipal]));
  }

  if (!fechas.length) {
    throw new Error('La tabla se encontró pero no contiene filas de datos.');
  }

  // 5) Run del modelo (p. ej. "02/10/2026 12Z"), si aparece en la página
  let run = '';
  // (el nombre del modelo puede llevar espacios: "Run ECMWF AIFS ENS du ...")
  const mr = /Run [\w\- ]+? du\s+([\d\/]+)\s+(\d+Z)/i.exec(limpiarTexto_(html));
  if (mr) run = mr[1] + ' ' + mr[2];

  return {
    run: run,
    fechas: fechas,
    horasPrevision: horasPrevision,
    miembros: miembros,                                  // { "1": [...], ... }
    principal: colPrincipal >= 0 ? principal : null      // línea gruesa (si existe)
  };
}

function limpiarTexto_(s) {
  return String(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function aNumero_(s) {
  const n = parseFloat(String(s).replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// MEDIA CLIMÁTICA 1991-2020 (Temp. 850 hPa) – directamente de Wetterzentrale
// La gráfica de Wetterzentrale (GFS ensemble, Barcelona, geoid 37417) carga sus
// datos con un JSONP: /ens_feed.php?geoid=37417&var=2&run=12&date=AAAA-MM-DD&model=gfs...
// Ese feed incluye la serie "LT MEAN 1991-2020"; aquí se descarga y se localiza.
// ---------------------------------------------------------------------------
const WZ = {
  geoid: 37417,                  // Barcelona en Wetterzentrale
  model: 'gfs',
  var: 2,                        // 2 = Temp. 850 hPa
  runs: ['18', '12', '06', '00'],// ejecuciones posibles de cada día
  diasAtras: 3,                  // se consideran hoy, ayer y anteayer
  puntosSuficientes: 56,         // un run con >= 56 puntos (14 días a 6 h) se da por completo
  maxIntentos: 8,                // cuántos runs (del más reciente al más antiguo) se prueban como máximo
  desfaseHoras: 0,               // si la línea sale desplazada respecto a la web, ajusta (p. ej. 2)
  cacheSegundos: 1800
};

function urlFeedWZ_(fecha, run) {
  return 'https://wetterzentrale.de/ens_feed.php?geoid=' + WZ.geoid + '&var=' + WZ.var +
         '&run=' + run + '&date=' + fecha + '&model=' + WZ.model +
         '&member=ENS&bw=1&tr=6&callback=cb';
}

// Runs candidatos, del más reciente al más antiguo (sin los que aún no han salido)
function candidatosFeedWZ_() {
  const ahora = Date.now();
  const lista = [];
  for (let d = 0; d < WZ.diasAtras; d++) {
    const dia = new Date(ahora - d * 86400000);
    const fecha = Utilities.formatDate(dia, 'GMT', 'yyyy-MM-dd');
    const base = Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate());
    WZ.runs.forEach(function (run) {
      const t = base + parseInt(run, 10) * 3600000;
      if (t <= ahora) lista.push({ t: t, url: urlFeedWZ_(fecha, run) });
    });
  }
  lista.sort(function (a, b) { return b.t - a.t; });
  return lista.slice(0, WZ.maxIntentos).map(function (e) { return e.url; });
}

// Quita el envoltorio JSONP "cb({...});" y parsea
function parsearJsonp_(txt) {
  let t = String(txt).trim();
  const m = /^[\w$.]*\(([\s\S]*)\)\s*;?\s*$/.exec(t);
  if (m) t = m[1];
  return JSON.parse(t);
}

function aMsWZ_(t) {
  if (typeof t === 'number') return t > 1e11 ? t : t * 1000;
  const s = String(t).trim();
  if (/^\d{9,}$/.test(s)) return aMsWZ_(parseInt(s, 10));
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const p = Date.parse(s);
  return isNaN(p) ? null : p;
}

// Resumen de la estructura del feed (para los mensajes de error y el diagnóstico)
function resumenFeed_(json) {
  const partes = [];
  (function walk(n, ruta, prof) {
    if (n === null || typeof n !== 'object' || prof > 3 || partes.length > 40) return;
    if (Array.isArray(n)) {
      partes.push(ruta + '[' + n.length + '] ' + JSON.stringify(n.slice(0, 2)).slice(0, 60));
      if (n.length && typeof n[0] === 'object') walk(n[0], ruta + '[0]', prof + 1);
      return;
    }
    Object.keys(n).forEach(function (k) {
      const v = n[k];
      if (v !== null && typeof v === 'object') walk(v, ruta + '.' + k, prof + 1);
      else partes.push(ruta + '.' + k + '=' + JSON.stringify(v).slice(0, 40));
    });
  })(json, '', 0);
  return partes.join(' | ').slice(0, 1500);
}

function zonaHorariaFeed_(json) {
  let tz = 0, ok = false;
  (function walk(n) {
    if (ok || n === null || typeof n !== 'object') return;
    if (!Array.isArray(n) && n.timezone !== undefined && !isNaN(parseFloat(n.timezone))) {
      tz = parseFloat(n.timezone); ok = true; return;
    }
    Object.keys(n).forEach(function (k) { walk(n[k]); });
  })(json);
  return tz;   // el feed trae las fechas en hora local (UTC+tz); se pasan a UTC restándola
}

function buscarNodoForecast_(json) {
  let nodo = null;
  (function walk(n) {
    if (nodo || n === null || typeof n !== 'object') return;
    if (!Array.isArray(n) && Array.isArray(n.datetime)) { nodo = n; return; }
    Object.keys(n).forEach(function (k) { walk(n[k]); });
  })(json);
  return nodo;
}

function resumenNodo_(nodo) {
  return Object.keys(nodo).map(function (k) {
    const v = nodo[k];
    if (Array.isArray(v)) return k + ':arr[' + v.length + ']' + JSON.stringify(v.slice(0, 2)).slice(0, 50);
    if (v !== null && typeof v === 'object') return k + ':obj{' + Object.keys(v).slice(0, 8).join(',') + '}';
    return k + ':' + JSON.stringify(v).slice(0, 30);
  }).join(' | ').slice(0, 1500);
}

// Series (con nombre y valores) que hay en el nodo del feed, en orden
function listarSeriesNodo_(nodo) {
  const n = nodo.datetime.length;
  const esNum = function (v) { return v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)); };
  const primero = function (v) { return v.find(function (e) { return e !== null && e !== undefined; }); };
  const lista = [];
  Object.keys(nodo).forEach(function (k) {
    const v = nodo[k];
    if (k === 'datetime' || !Array.isArray(v) || !v.length) return;
    const p0 = primero(v);
    if (v.length === n && v.some(esNum) && typeof p0 !== 'object') {
      lista.push({ nombre: k, valores: v });
    } else if (v.every(function (e) { return Array.isArray(e) && e.length === n; })) {
      v.forEach(function (e, i) { lista.push({ nombre: k + '[' + i + ']', valores: e }); });
    } else if (v.every(function (e) { return e && typeof e === 'object' && !Array.isArray(e) && Array.isArray(e.data) && e.data.length === n; })) {
      v.forEach(function (e, i) { lista.push({ nombre: String(e.name || e.label || (k + '[' + i + ']')), valores: e.data }); });
    }
  });
  return lista;
}

// Formato real del feed: [ { ..., timezone, forecast: [ { datetime:[...], ...series... } ] } ]
function extraerDeForecast_(json) {
  const nodo = buscarNodoForecast_(json);
  if (!nodo) return null;
  const tiempos = nodo.datetime, n = tiempos.length;
  const esNum = function (v) { return v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)); };
  const primero = function (v) { return v.find(function (e) { return e !== null && e !== undefined; }); };

  const lista = listarSeriesNodo_(nodo);
  if (!lista.length) throw new Error('El feed no contiene series con las fechas esperadas. Nodo: ' + resumenNodo_(nodo));

  // 2) Nombres de las series, si el feed los trae aparte (lista de textos de la misma longitud)
  (function walk(o) {
    if (o === null || typeof o !== 'object') return;
    Object.keys(o).forEach(function (k) {
      const v = o[k];
      if (Array.isArray(v) && v.length === lista.length && v.length > 2 &&
          v.every(function (s) { return typeof s === 'string' && s.charAt(0) !== '#'; })) {
        v.forEach(function (s, i) { lista[i].nombre = s; });
      } else walk(v);
    });
  })(json);

  // 3) Elegir la climatología: por nombre; si no hay nombres, la última (como en la leyenda de la web)
  const re = /lt\s*mean|1991|clim|normal|^lt|^mean$/i;
  let elegida = lista.filter(function (e) { return re.test(e.nombre); })[0];
  let aviso = '';
  if (!elegida) {
    if (lista.length < 3) throw new Error('No se identificó la serie climática. Nodo: ' + resumenNodo_(nodo));
    elegida = lista[lista.length - 1];
    aviso = 'Climatología: se ha usado la última serie del feed (' + elegida.nombre + '); compruébala con Wetterzentrale';
  }

  const tz = zonaHorariaFeed_(json);
  const x = [], y = [];
  tiempos.forEach(function (t, i) {
    const ms = aMsWZ_(t), v = elegida.valores[i];
    if (ms === null || !esNum(v)) return;
    x.push(Utilities.formatDate(new Date(ms - tz * 3600000 + WZ.desfaseHoras * 3600000), 'GMT', 'yyyy-MM-dd HH:mm:ss'));
    y.push(Math.round(parseFloat(v) * 100) / 100);
  });
  if (!x.length) throw new Error('La serie climática está vacía. Nodo: ' + resumenNodo_(nodo));
  return { x: x, y: y, serie: elegida.nombre, aviso: aviso };
}

// Localiza la serie climática dentro del JSON y la devuelve como {x:[...], y:[...]}
function extraerClimaFeed_(json) {
  const dirigido = extraerDeForecast_(json);
  if (dirigido) return dirigido;
  const re = /lt\s*mean|1991|clim|normal/i;
  const claveDatos = function (o) { return o.data || o.values || o.y || null; };
  let hallada = null;

  (function walk(n) {
    if (hallada || n === null || typeof n !== 'object') return;
    if (!Array.isArray(n)) {
      const nombre = n.name || n.label || n.title || n.id || '';
      if (typeof nombre === 'string' && re.test(nombre) && claveDatos(n)) {
        hallada = { serie: claveDatos(n), padre: n }; return;
      }
    }
    Object.keys(n).forEach(function (k) {
      if (hallada) return;
      const v = n[k];
      if (re.test(k) && v && typeof v === 'object') {
        if (Array.isArray(v) && v.length) { hallada = { serie: v, padre: n }; return; }
        if (!Array.isArray(v) && claveDatos(v)) { hallada = { serie: claveDatos(v), padre: v }; return; }
      }
      walk(v);
    });
  })(json);

  if (!hallada) throw new Error('No se encontró la serie climática en el feed. Estructura: ' + resumenFeed_(json));

  const serie = hallada.serie;
  const n = serie.length;
  let ts = [], vs = [];

  const primero = serie.find(function (e) { return e !== null && e !== undefined; });
  if (Array.isArray(primero)) {                       // [[t, v], ...]
    serie.forEach(function (e) { ts.push(e[0]); vs.push(e[1]); });
  } else if (primero && typeof primero === 'object') { // [{x:..., y:...}, ...]
    serie.forEach(function (e) { ts.push(e.x !== undefined ? e.x : e.t); vs.push(e.y !== undefined ? e.y : e.v); });
  } else {                                            // [v, v, v...] -> buscar los tiempos aparte
    vs = serie.slice();
    const reT = /^(time|times|date|dates|x|categories|labels|timestamps|t|xaxis)$/i;
    const buscar = function (o) {
      if (!o || typeof o !== 'object') return null;
      const ks = Object.keys(o);
      for (let i = 0; i < ks.length; i++) {
        const v = o[ks[i]];
        if (reT.test(ks[i]) && Array.isArray(v) && v.length === n) return v;
      }
      for (let i = 0; i < ks.length; i++) {            // cualquier array de fechas de la misma longitud
        const v = o[ks[i]];
        if (Array.isArray(v) && v.length === n && v[0] !== null && typeof v[0] !== 'object' &&
            v !== serie && aMsWZ_(v[0]) !== null && (typeof v[0] === 'string' || v[0] > 1e9)) return v;
      }
      return null;
    };
    ts = buscar(hallada.padre) || buscar(json);
    if (!ts) {
      const pi = hallada.padre.pointInterval || json.pointInterval;
      const ps = hallada.padre.pointStart || json.pointStart;
      if (pi && ps) ts = vs.map(function (_, i) { return ps + i * pi; });
    }
    if (!ts) throw new Error('Se encontró la serie climática pero no sus fechas. Estructura: ' + resumenFeed_(json));
  }

  const x = [], y = [];
  ts.forEach(function (t, i) {
    const ms = aMsWZ_(t);
    const v = vs[i];
    if (ms === null || v === null || v === undefined || isNaN(parseFloat(v))) return;
    x.push(Utilities.formatDate(new Date(ms - zonaHorariaFeed_(json) * 3600000 + WZ.desfaseHoras * 3600000), 'GMT', 'yyyy-MM-dd HH:mm:ss'));
    y.push(Math.round(parseFloat(v) * 100) / 100);
  });
  if (!x.length) throw new Error('La serie climática está vacía. Estructura: ' + resumenFeed_(json));
  return { x: x, y: y };
}

// Descarga una URL sin que un fallo de red/servidor tumbe todo (fetch, no fetchAll)
function descargarWZ_(url) {
  return UrlFetchApp.fetch(url, {
    muteHttpExceptions: true, followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Referer': 'https://wetterzentrale.de/show_diagrams.php?geoid=' + WZ.geoid + '&model=' + WZ.model,
      'Accept': 'application/javascript, application/json, */*'
    }
  });
}

// Llamada desde el cliente: google.script.run.obtenerClimatologia()
function obtenerClimatologia() {
  const cache = CacheService.getScriptCache();
  const clave = 'CLIMA_WZ_v2_' + WZ.geoid + '_' + WZ.model + '_' + WZ.var + '_' + WZ.desfaseHoras;
  const guardado = cache.get(clave);
  if (guardado) return JSON.parse(guardado);

  // La climatología solo depende de la fecha, así que se fusionan los puntos de varios runs:
  // los más recientes cubren el final de la previsión y el anterior cubre las primeras horas.
  // (Un run recién publicado puede venir a medias; no importa, solo aporta puntos válidos.)
  const urls = candidatosFeedWZ_();
  const fallos = [];
  const mapa = {};
  let completos = 0;
  for (let i = 0; i < urls.length; i++) {
    try {
      const r = descargarWZ_(urls[i]);
      const codigo = r.getResponseCode();
      if (codigo !== 200) { fallos.push('HTTP ' + codigo + ' (' + urls[i].match(/run=(\d+)&date=([\d-]+)/).slice(1).join(' ') + ')'); continue; }
      const out = extraerClimaFeed_(parsearJsonp_(r.getContentText()));
      out.x.forEach(function (x, k) { if (!(x in mapa)) mapa[x] = out.y[k]; });
      if (out.x.length >= WZ.puntosSuficientes) completos++;
      if (completos >= 2) break;
    } catch (e) {
      fallos.push(e.message);
    }
  }
  const xs = Object.keys(mapa).sort();   // 'aaaa-mm-dd hh:mm:ss' se ordena bien como texto
  if (xs.length) {
    const resultado = { x: xs, y: xs.map(function (k) { return mapa[k]; }), serie: 'MEAN', aviso: '' };
    try { cache.put(clave, JSON.stringify(resultado), completos ? WZ.cacheSegundos : 300); } catch (e) {}
    return resultado;
  }
  // Se prioriza un motivo "con contenido" (estructura del feed) frente a errores de red
  const informativo = fallos.filter(function (f) { return /Estructura|Nodo|serie/.test(f); })[0];
  throw new Error(informativo || ('Wetterzentrale no devolvió datos válidos. Intentos: ' + fallos.slice(0, 4).join(' ; ')));
}

// DIAGNÓSTICO: ejecútala desde el editor (Ejecutar > probarClimatologia_) y pega el registro.
function probarClimatologia_() {
  candidatosFeedWZ_().forEach(function (u) {
    try {
      const r = descargarWZ_(u);
      const txt = r.getContentText();
      Logger.log('%s\n  HTTP %s, %s caracteres\n  Inicio: %s', u, r.getResponseCode(), txt.length, txt.slice(0, 400));
      const j = parsearJsonp_(txt);
      const nodo = buscarNodoForecast_(j);
      Logger.log('  Estructura: %s', nodo ? 'NODO FORECAST -> ' + resumenNodo_(nodo) : resumenFeed_(j));
      if (nodo) {
        const ts = nodo.datetime, tz = zonaHorariaFeed_(j);
        const f = function (i) { return Utilities.formatDate(new Date(aMsWZ_(ts[i]) - tz * 3600000), 'GMT', 'yyyy-MM-dd HH:mm'); };
        Logger.log('  datetime: %s fechas, de %s a %s (UTC)', ts.length, f(0), f(ts.length - 1));
        listarSeriesNodo_(nodo).forEach(function (s) {
          let ini = -1, fin = -1, cuenta = 0;
          s.valores.forEach(function (v, i) {
            if (v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v))) { if (ini < 0) ini = i; fin = i; cuenta++; }
          });
          Logger.log('    serie "%s": %s valores no nulos%s', s.nombre, cuenta,
            cuenta ? ' (de ' + f(ini) + ' a ' + f(fin) + ')' : '');
        });
      }
      const c = extraerClimaFeed_(j);
      Logger.log('  OK climatología (serie "%s"): %s puntos, de %s a %s (UTC). Primeros valores: %s',
        c.serie || '?', c.x.length, c.x[0], c.x[c.x.length - 1], JSON.stringify(c.y.slice(0, 6)));
      if (c.aviso) Logger.log('  AVISO: %s', c.aviso);
    } catch (e) {
      Logger.log('  ERROR: %s', e.message);
    }
  });
}

// Para probar desde el editor de Apps Script: Ejecutar > probar_
function probar_() {
  const d = obtenerDatos();
  d.modelos.forEach(function (m) {
    if (m.error) {
      Logger.log('%s -> ERROR: %s', m.nombre, m.error);
    } else {
      Logger.log('%s | run: %s | filas: %s | miembros: %s | línea gruesa: %s',
        m.nombre, m.run, m.fechas.length, Object.keys(m.miembros).length, m.principal ? 'sí' : 'no');
    }
  });
}
// Versión sin guion bajo final, para que aparezca en el desplegable de funciones del editor
function probarClimatologia() { probarClimatologia_(); }
