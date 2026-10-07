const express = require('express');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 8080;

// Connect to SQLite dictionary database
const dbPath = path.join(__dirname, 'data', 'dictionary.db');
const indexPath = path.join(__dirname, 'public', 'index.html');
let db = null;

try {
  db = new DatabaseSync(dbPath);
  console.log(`Base de datos SQLite conectada con éxito desde: ${dbPath}`);
} catch (err) {
  console.error('Error abriendo base de datos SQLite:', err);
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Health check endpoint for Google Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Attribution / Legal metadata endpoint
app.get('/api/attribution', (req, res) => {
  res.json({
    database: 'JMdict-Simplified (Edición en Español)',
    databaseUrl: 'https://github.com/scriptin/jmdict-simplified',
    version: '3.6.2',
    dictDate: '2026-10-05',
    originalProject: 'JMdict / Electronic Dictionary Research and Development Group (EDRDG)',
    originalUrl: 'http://www.edrdg.org/edrdg/licence.html',
    license: 'Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    totalEntries: 34309,
    description: 'Este servicio utiliza el archivo de diccionario JMdict de acuerdo con la licencia de EDRDG y del proyecto JMdict-Simplified creado por scriptin.'
  });
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper: transform SQLite row to API object
function formatWordRow(row) {
  let definitions = [];
  try {
    definitions = JSON.parse(row.definitions_json || '[]');
  } catch (e) {
    definitions = [row.spanish];
  }

  let example = null;
  if (row.example_json) {
    try {
      example = JSON.parse(row.example_json);
    } catch (e) {}
  }

  return {
    id: row.id,
    kanji: row.kanji,
    hiragana: row.hiragana,
    romaji: row.romaji,
    spanish: row.spanish,
    category: row.category,
    category_es: row.category_es,
    common: Boolean(row.common),
    definitions,
    example,
    notes: row.notes || 'Entrada oficial de JMdict (EDRDG)'
  };
}

// API: Search and filter dictionary
app.get('/api/dictionary', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Base de datos no disponible' });
  }

  const q = (req.query.q || '').trim();
  const category = req.query.category || 'all';
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  try {
    if (q) {
      const pattern = `%${q}%`;
      const prefixPattern = `${q}%`;

      let countSql = `
        SELECT COUNT(*) as total FROM words
        WHERE (kanji LIKE ? OR hiragana LIKE ? OR romaji LIKE ? OR spanish LIKE ?)
      `;
      const countParams = [pattern, pattern, pattern, pattern];

      if (category !== 'all') {
        countSql += ` AND category = ?`;
        countParams.push(category);
      }

      const countResult = db.prepare(countSql).get(...countParams);
      const total = countResult ? countResult.total : 0;

      let selectSql = `
        SELECT * FROM words
        WHERE (kanji LIKE ? OR hiragana LIKE ? OR romaji LIKE ? OR spanish LIKE ?)
      `;
      const selectParams = [pattern, pattern, pattern, pattern];

      if (category !== 'all') {
        selectSql += ` AND category = ?`;
        selectParams.push(category);
      }

      selectSql += `
        ORDER BY
          CASE
            WHEN kanji = ? THEN 1
            WHEN hiragana = ? THEN 2
            WHEN romaji = ? THEN 3
            WHEN spanish = ? THEN 4
            WHEN kanji LIKE ? THEN 5
            WHEN hiragana LIKE ? THEN 6
            ELSE 7
          END,
          common DESC,
          length(kanji) ASC
        LIMIT ? OFFSET ?
      `;
      selectParams.push(q, q, q, q, prefixPattern, prefixPattern, limit, offset);

      const rows = db.prepare(selectSql).all(...selectParams);
      res.json({
        total,
        limit,
        offset,
        entries: rows.map(formatWordRow)
      });
    } else {
      // Empty search: return common words prioritized
      let countSql = `SELECT COUNT(*) as total FROM words`;
      const countParams = [];

      if (category !== 'all') {
        countSql += ` WHERE category = ?`;
        countParams.push(category);
      }

      const countResult = db.prepare(countSql).get(...countParams);
      const total = countResult ? countResult.total : 0;

      let selectSql = `SELECT * FROM words`;
      const selectParams = [];

      if (category !== 'all') {
        selectSql += ` WHERE category = ?`;
        selectParams.push(category);
      }

      selectSql += ` ORDER BY common DESC, id ASC LIMIT ? OFFSET ?`;
      selectParams.push(limit, offset);

      const rows = db.prepare(selectSql).all(...selectParams);
      res.json({
        total,
        limit,
        offset,
        entries: rows.map(formatWordRow)
      });
    }
  } catch (err) {
    console.error('Error en consulta de diccionario:', err);
    res.status(500).json({ error: 'Error ejecutando la consulta' });
  }
});

// API: Get entry by Word identifier (kanji / hiragana / ID)
app.get('/api/dictionary/word/:identifier', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Base de datos no disponible' });
  }

  try {
    const rawId = decodeURIComponent(req.params.identifier);
    const row = db.prepare('SELECT * FROM words WHERE kanji = ? OR hiragana = ? OR id = ? ORDER BY common DESC LIMIT 1').get(rawId, rawId, rawId);
    if (!row) {
      return res.status(404).json({ error: 'Palabra no encontrada' });
    }
    res.json(formatWordRow(row));
  } catch (err) {
    console.error('Error buscando palabra por identificador:', err);
    res.status(500).json({ error: 'Error buscando palabra' });
  }
});

// API: Get entry by ID
app.get('/api/dictionary/:id', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Base de datos no disponible' });
  }

  try {
    const row = db.prepare('SELECT * FROM words WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Palabra no encontrada' });
    }
    res.json(formatWordRow(row));
  } catch (err) {
    console.error('Error buscando palabra:', err);
    res.status(500).json({ error: 'Error buscando palabra' });
  }
});

// API: Summary Stats
app.get('/api/stats', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Base de datos no disponible' });
  }

  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN category = 'verb' THEN 1 ELSE 0 END) as verbs,
        SUM(CASE WHEN category = 'noun' THEN 1 ELSE 0 END) as nouns,
        SUM(CASE WHEN category = 'adjective' THEN 1 ELSE 0 END) as adjectives,
        SUM(CASE WHEN category = 'expression' THEN 1 ELSE 0 END) as expressions,
        SUM(common) as commonTotal
      FROM words
    `).get();

    res.json({
      total: stats.total,
      verbsCount: stats.verbs,
      nounsCount: stats.nouns,
      adjectivesCount: stats.adjectives,
      expressionsCount: stats.expressions,
      commonCount: stats.commonTotal
    });
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// API: Text-to-Speech proxy (returns native Japanese audio MP3)
app.get('/api/tts', async (req, res) => {
  const text = req.query.q;
  if (!text) {
    return res.status(400).send('Query parameter q is required');
  }

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(text)}`;
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Error fetching TTS audio');
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Error generating TTS:', err);
    res.status(500).send('Internal server error generating TTS');
  }
});

// SEO & Deep-link: /word/:identifier (Jisho.org style URL)
app.get(['/word/:identifier', '/palabra/:identifier'], (req, res) => {
  try {
    const identifier = decodeURIComponent(req.params.identifier);
    let word = null;
    if (db) {
      const row = db.prepare('SELECT * FROM words WHERE kanji = ? OR hiragana = ? OR id = ? ORDER BY common DESC LIMIT 1').get(identifier, identifier, identifier);
      if (row) {
        word = formatWordRow(row);
      }
    }

    let html = fs.readFileSync(indexPath, 'utf8');
    if (word) {
      const title = `${word.kanji} (${word.hiragana}) - Diccionario Japonés-Español | Murasaki no Jisho`;
      const description = `Significado en español de ${word.kanji} (${word.hiragana} - ${word.romaji}): ${word.spanish}. Pronunciación, kanji y definiciones completas.`;
      const wordJson = JSON.stringify(word).replace(/</g, '\\u003c');

      html = html.replace('<title>Murasaki no Jisho | Diccionario Japonés-Español</title>', `<title>${escapeHtml(title)}</title>`);
      html = html.replace(
        '<meta name="description" content="Diccionario Japonés-Español interactivo con más de 34.300 entradas, kanji, hiragana, rōmaji y pronunciación nativa.">',
        `<meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(word.kanji + ' (' + word.hiragana + ') — ' + word.spanish)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="https://jisho.balears.tech/word/${encodeURIComponent(word.kanji || word.id)}">
  <script>window.__INITIAL_WORD__ = ${wordJson};</script>`
      );
    }
    res.send(html);
  } catch (e) {
    console.error('Error sirviendo ruta /word:', e);
    res.sendFile(indexPath);
  }
});

// SEO & Deep-link: /search/:query
app.get('/search/:query', (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    let html = fs.readFileSync(indexPath, 'utf8');
    const title = `Buscar "${query}" - Diccionario Japonés-Español | Murasaki no Jisho`;
    const queryJson = JSON.stringify(query).replace(/</g, '\\u003c');

    html = html.replace('<title>Murasaki no Jisho | Diccionario Japonés-Español</title>', `<title>${escapeHtml(title)}</title>`);
    html = html.replace(
      '</head>',
      `  <script>window.__INITIAL_SEARCH__ = ${queryJson};</script>\n</head>`
    );
    res.send(html);
  } catch (e) {
    res.sendFile(indexPath);
  }
});

// Home page
app.get('/', (req, res) => {
  res.sendFile(indexPath);
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Murasaki no Jisho ejecutándose en http://localhost:${PORT}`);
  console.log(`Base de datos: 34.309 entradas de JMdict-Simplified`);
  console.log(`Rutas compatibles con Jisho.org: /word/:kanji y /search/:query`);
});
