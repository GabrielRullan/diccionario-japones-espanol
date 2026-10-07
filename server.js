const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Load dictionary dataset
const dataPath = path.join(__dirname, 'data', 'dictionary.json');
let dictionaryData = { words: [] };

try {
  const rawData = fs.readFileSync(dataPath, 'utf8');
  dictionaryData = JSON.parse(rawData);
} catch (err) {
  console.error('Error cargando diccionario:', err);
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint for Google Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API: Get all entries with optional search/category filter
app.get('/api/dictionary', (req, res) => {
  const { q, category, jlpt } = req.query;
  let results = dictionaryData.words;

  if (category && category !== 'all') {
    results = results.filter(w => w.category === category);
  }

  if (jlpt && jlpt !== 'all') {
    results = results.filter(w => w.jlpt === jlpt);
  }

  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    results = results.filter(w =>
      w.kanji.toLowerCase().includes(query) ||
      w.hiragana.toLowerCase().includes(query) ||
      w.romaji.toLowerCase().includes(query) ||
      w.spanish.toLowerCase().includes(query) ||
      w.definitions.some(d => d.toLowerCase().includes(query))
    );
  }

  res.json({
    total: results.length,
    entries: results
  });
});

// API: Get entry by ID
app.get('/api/dictionary/:id', (req, res) => {
  const word = dictionaryData.words.find(w => w.id === req.params.id);
  if (!word) {
    return res.status(404).json({ error: 'Palabra no encontrada' });
  }
  res.json(word);
});

// API: Categories summary
app.get('/api/stats', (req, res) => {
  const words = dictionaryData.words;
  res.json({
    total: words.length,
    wordsCount: words.filter(w => w.category === 'word').length,
    nounsCount: words.filter(w => w.category === 'noun').length,
    adjectivesCount: words.filter(w => w.category === 'adjective').length,
    jlptCounts: {
      N5: words.filter(w => w.jlpt === 'N5').length,
      N4: words.filter(w => w.jlpt === 'N4').length
    }
  });
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

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Kotoba Sol Diccionario ejecutándose en http://localhost:${PORT}`);
  console.log(`Listo para Google Cloud Run en puerto ${PORT}`);
});
