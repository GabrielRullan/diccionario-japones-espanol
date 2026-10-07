const express = require('express');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { deinflect } = require('./lib/deinflect');

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
    databases: [
      {
        name: 'JMdict-Simplified (Edición en Español)',
        url: 'https://github.com/scriptin/jmdict-simplified',
        version: '3.6.2',
        license: 'Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)',
        entries: 34309
      },
      {
        name: 'KANJIDIC2 (EDRDG / scriptin)',
        url: 'http://www.edrdg.org/wiki/index.php/KANJIDIC_Project',
        license: 'Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)',
        entries: 13108
      },
      {
        name: 'Corpus Tatoeba (Japonés - Español)',
        url: 'https://tatoeba.org',
        license: 'Creative Commons Attribution 2.0 France (CC BY 2.0 FR)',
        entries: 39748
      }
    ],
    description: 'Este servicio utiliza datos lingüísticos abiertos de JMdict, KANJIDIC2 y Tatoeba bajo sus respectivas licencias Creative Commons.'
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

// Helper: fetch example sentences for a word
function getExamplesForWord(keyword, limit = 3) {
  if (!db || !keyword) return [];
  try {
    return db.prepare('SELECT japanese, spanish FROM sentences WHERE japanese LIKE ? LIMIT ?').all(`%${keyword}%`, limit);
  } catch (e) {
    return [];
  }
}

// Helper: transform SQLite row to API word object
function formatWordRow(row, includeExamples = false) {
  let definitions = [];
  try {
    definitions = JSON.parse(row.definitions_json || '[]');
  } catch (e) {
    definitions = [row.spanish];
  }

  const wordObj = {
    id: row.id,
    kanji: row.kanji,
    hiragana: row.hiragana,
    romaji: row.romaji,
    spanish: row.spanish,
    category: row.category,
    category_es: row.category_es,
    common: Boolean(row.common),
    jlpt: row.jlpt ? `N${row.jlpt}` : null,
    jlptNum: row.jlpt || null,
    definitions,
    notes: row.notes || 'Entrada oficial de JMdict (EDRDG)'
  };

  if (includeExamples) {
    wordObj.sentences = getExamplesForWord(row.kanji || row.hiragana, 3);
  }

  return wordObj;
}

// Helper: format Kanji row
function formatKanjiRow(row) {
  return {
    literal: row.literal,
    strokes: row.strokes,
    grade: row.grade,
    freq: row.freq,
    jlpt: row.jlpt ? `N${row.jlpt}` : null,
    radical: row.radical,
    onReadings: JSON.parse(row.on_readings_json || '[]'),
    kunReadings: JSON.parse(row.kun_readings_json || '[]'),
    meaningsEs: JSON.parse(row.meanings_es_json || '[]'),
    meaningsEn: JSON.parse(row.meanings_en_json || '[]'),
    nanori: JSON.parse(row.nanori_json || '[]')
  };
}

// API: Search and filter dictionary (supports deinflection and JLPT)
app.get('/api/dictionary', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Base de datos no disponible' });
  }

  const q = (req.query.q || '').trim();
  const category = req.query.category || 'all';
  const jlptFilter = req.query.jlpt ? parseInt(req.query.jlpt, 10) : null;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  try {
    let deinflectionInfo = null;

    if (q) {
      const pattern = `%${q}%`;
      const prefixPattern = `${q}%`;

      // 1. Comprobar si q es una forma conjugada (desinflexión)
      const candidates = deinflect(q);
      let matchedCandidate = null;

      if (candidates.length > 0) {
        for (const cand of candidates) {
          const match = db.prepare('SELECT * FROM words WHERE kanji = ? OR hiragana = ? LIMIT 1').get(cand.term, cand.term);
          if (match) {
            matchedCandidate = { ...cand, word: match };
            deinflectionInfo = {
              original: q,
              base: cand.term,
              form: cand.description,
              baseWord: formatWordRow(match)
            };
            break;
          }
        }
      }

      let countSql = `
        SELECT COUNT(*) as total FROM words
        WHERE (kanji LIKE ? OR hiragana LIKE ? OR romaji LIKE ? OR spanish LIKE ?)
      `;
      const countParams = [pattern, pattern, pattern, pattern];

      if (category !== 'all') {
        countSql += ` AND category = ?`;
        countParams.push(category);
      }
      if (jlptFilter) {
        countSql += ` AND jlpt = ?`;
        countParams.push(jlptFilter);
      }

      const countResult = db.prepare(countSql).get(...countParams);
      let total = countResult ? countResult.total : 0;

      let selectSql = `
        SELECT * FROM words
        WHERE (kanji LIKE ? OR hiragana LIKE ? OR romaji LIKE ? OR spanish LIKE ?)
      `;
      const selectParams = [pattern, pattern, pattern, pattern];

      if (category !== 'all') {
        selectSql += ` AND category = ?`;
        selectParams.push(category);
      }
      if (jlptFilter) {
        selectSql += ` AND jlpt = ?`;
        selectParams.push(jlptFilter);
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

      let rows = db.prepare(selectSql).all(...selectParams);

      // Si la búsqueda directa tiene pocos resultados y tenemos una desinflexión confirmada,
      // anteponemos la forma base al principio de la lista
      if (matchedCandidate && matchedCandidate.word) {
        const baseAlreadyInRows = rows.some(r => r.id === matchedCandidate.word.id);
        if (!baseAlreadyInRows) {
          rows.unshift(matchedCandidate.word);
          total++;
        }
      }

      res.json({
        total,
        limit,
        offset,
        deinflection: deinflectionInfo,
        entries: rows.map(r => formatWordRow(r))
      });
    } else {
      // Búsqueda vacía: mostrar resultados ordenados por relevancia común
      let countSql = `SELECT COUNT(*) as total FROM words WHERE 1=1`;
      const countParams = [];

      if (category !== 'all') {
        countSql += ` AND category = ?`;
        countParams.push(category);
      }
      if (jlptFilter) {
        countSql += ` AND jlpt = ?`;
        countParams.push(jlptFilter);
      }

      const countResult = db.prepare(countSql).get(...countParams);
      const total = countResult ? countResult.total : 0;

      let selectSql = `SELECT * FROM words WHERE 1=1`;
      const selectParams = [];

      if (category !== 'all') {
        selectSql += ` AND category = ?`;
        selectParams.push(category);
      }
      if (jlptFilter) {
        selectSql += ` AND jlpt = ?`;
        selectParams.push(jlptFilter);
      }

      selectSql += ` ORDER BY common DESC, id ASC LIMIT ? OFFSET ?`;
      selectParams.push(limit, offset);

      const rows = db.prepare(selectSql).all(...selectParams);
      res.json({
        total,
        limit,
        offset,
        deinflection: null,
        entries: rows.map(r => formatWordRow(r))
      });
    }
  } catch (err) {
    console.error('Error en consulta de diccionario:', err);
    res.status(500).json({ error: 'Error ejecutando la consulta' });
  }
});

// API: Get entry by Word identifier (kanji / hiragana / ID) with sentences
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
    res.json(formatWordRow(row, true));
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
    res.json(formatWordRow(row, true));
  } catch (err) {
    console.error('Error buscando palabra:', err);
    res.status(500).json({ error: 'Error buscando palabra' });
  }
});

// API: Get Kanji details by character
app.get('/api/kanji/:character', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Base de datos no disponible' });
  }

  try {
    const char = decodeURIComponent(req.params.character).trim();
    const row = db.prepare('SELECT * FROM kanjis WHERE literal = ?').get(char);
    if (!row) {
      return res.status(404).json({ error: 'Kanji no encontrado' });
    }
    res.json(formatKanjiRow(row));
  } catch (err) {
    console.error('Error buscando kanji:', err);
    res.status(500).json({ error: 'Error buscando kanji' });
  }
});

// API: Get example sentences (Tatoeba)
app.get('/api/sentences', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Base de datos no disponible' });
  }

  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ total: 0, sentences: [] });
    }
    const rows = db.prepare('SELECT * FROM sentences WHERE japanese LIKE ? OR spanish LIKE ? LIMIT 25').all(`%${q}%`, `%${q}%`);
    res.json({ total: rows.length, sentences: rows });
  } catch (err) {
    console.error('Error consultando oraciones:', err);
    res.status(500).json({ error: 'Error consultando oraciones' });
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
        SUM(CASE WHEN jlpt = 5 THEN 1 ELSE 0 END) as jlptN5,
        SUM(CASE WHEN jlpt = 4 THEN 1 ELSE 0 END) as jlptN4,
        SUM(CASE WHEN jlpt = 3 THEN 1 ELSE 0 END) as jlptN3,
        SUM(CASE WHEN jlpt = 2 THEN 1 ELSE 0 END) as jlptN2,
        SUM(CASE WHEN jlpt = 1 THEN 1 ELSE 0 END) as jlptN1,
        SUM(common) as commonTotal
      FROM words
    `).get();

    const kanjiCount = db.prepare('SELECT COUNT(*) as total FROM kanjis').get().total;
    const sentenceCount = db.prepare('SELECT COUNT(*) as total FROM sentences').get().total;

    res.json({
      total: stats.total,
      verbsCount: stats.verbs,
      nounsCount: stats.nouns,
      adjectivesCount: stats.adjectives,
      expressionsCount: stats.expressions,
      jlpt: {
        n5: stats.jlptN5,
        n4: stats.jlptN4,
        n3: stats.jlptN3,
        n2: stats.jlptN2,
        n1: stats.jlptN1
      },
      kanjiCount,
      sentenceCount,
      commonCount: stats.commonTotal
    });
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// API: Text-to-Speech proxy
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

// Deep-link: /word/:identifier (Jisho.org style)
app.get(['/word/:identifier', '/palabra/:identifier'], (req, res) => {
  try {
    const identifier = decodeURIComponent(req.params.identifier);
    let word = null;
    if (db) {
      const row = db.prepare('SELECT * FROM words WHERE kanji = ? OR hiragana = ? OR id = ? ORDER BY common DESC LIMIT 1').get(identifier, identifier, identifier);
      if (row) {
        word = formatWordRow(row, true);
      }
    }

    let html = fs.readFileSync(indexPath, 'utf8');
    if (word) {
      const title = `${word.kanji} (${word.hiragana}) - Diccionario Japonés-Español | Murasaki no Jisho`;
      const description = `Significado en español de ${word.kanji} (${word.hiragana} - ${word.romaji}): ${word.spanish}. Pronunciación, kanji y ejemplos.`;
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

// Deep-link: /kanji/:character (Jisho.org style)
app.get('/kanji/:character', (req, res) => {
  try {
    const char = decodeURIComponent(req.params.character).trim();
    let kanji = null;
    if (db) {
      const row = db.prepare('SELECT * FROM kanjis WHERE literal = ?').get(char);
      if (row) {
        kanji = formatKanjiRow(row);
      }
    }

    let html = fs.readFileSync(indexPath, 'utf8');
    if (kanji) {
      const onStr = kanji.onReadings.join(', ');
      const kunStr = kanji.kunReadings.join(', ');
      const meanings = kanji.meaningsEs.length > 0 ? kanji.meaningsEs.join(', ') : kanji.meaningsEn.join(', ');
      const title = `Kanji ${kanji.literal} - Trazos, lecturas y significado | Murasaki no Jisho`;
      const desc = `Kanji ${kanji.literal} (${kanji.strokes} trazos). Lecturas On: ${onStr || '-'}. Kun: ${kunStr || '-'}. Significado: ${meanings}.`;
      const kanjiJson = JSON.stringify(kanji).replace(/</g, '\\u003c');

      html = html.replace('<title>Murasaki no Jisho | Diccionario Japonés-Español</title>', `<title>${escapeHtml(title)}</title>`);
      html = html.replace(
        '<meta name="description" content="Diccionario Japonés-Español interactivo con más de 34.300 entradas, kanji, hiragana, rōmaji y pronunciación nativa.">',
        `<meta name="description" content="${escapeHtml(desc)}">
  <meta property="og:title" content="${escapeHtml('Kanji ' + kanji.literal + ' — ' + meanings)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="https://jisho.balears.tech/kanji/${encodeURIComponent(kanji.literal)}">
  <script>window.__INITIAL_KANJI__ = ${kanjiJson};</script>`
      );
    }
    res.send(html);
  } catch (e) {
    res.sendFile(indexPath);
  }
});

// Deep-link: /search/:query
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
  console.log(`Bases integradas: JMdict (34.309), KANJIDIC2 (13.108), Tatoeba (39.748)`);
});
