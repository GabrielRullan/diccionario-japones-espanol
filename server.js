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

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Kotoba Sol Diccionario ejecutándose en http://localhost:${PORT}`);
  console.log(`Listo para Google Cloud Run en puerto ${PORT}`);
});
