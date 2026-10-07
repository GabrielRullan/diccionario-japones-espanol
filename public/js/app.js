// Murasaki no Jisho - Diccionario Japonés-Español

let allWords = [];
let currentFiltered = [];
let activeCategory = 'all';
let activeJlpt = 'all';
let recentWordIds = [];

const RECENT_STORAGE_KEY = 'murasaki_recent_words';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const cardsGrid = document.getElementById('cardsGrid');
const emptyState = document.getElementById('emptyState');
const resultsCount = document.getElementById('resultsCount');
const filterPills = document.getElementById('filterPills');
const jlptSelect = document.getElementById('jlptSelect');

// Recent Bar Elements
const recentContainer = document.getElementById('recentContainer');
const recentChips = document.getElementById('recentChips');
const clearRecentBtn = document.getElementById('clearRecentBtn');

// Modal Elements
const detailModal = document.getElementById('detailModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalKanji = document.getElementById('modalKanji');
const modalHiragana = document.getElementById('modalHiragana');
const modalRomaji = document.getElementById('modalRomaji');
const modalCategoryBadge = document.getElementById('modalCategoryBadge');
const modalJlptBadge = document.getElementById('modalJlptBadge');
const modalSpanish = document.getElementById('modalSpanish');
const modalDefinitions = document.getElementById('modalDefinitions');
const modalExampleJp = document.getElementById('modalExampleJp');
const modalExampleRomaji = document.getElementById('modalExampleRomaji');
const modalExampleEs = document.getElementById('modalExampleEs');
const modalNotes = document.getElementById('modalNotes');
const modalAudioBtn = document.getElementById('modalAudioBtn');

let currentActiveWord = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  loadRecentFromStorage();
  await loadDictionary();
  setupEventListeners();
});

// Load recent words from localStorage
function loadRecentFromStorage() {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (raw) {
      recentWordIds = JSON.parse(raw);
    }
  } catch (e) {
    recentWordIds = [];
  }
}

function saveRecentToStorage() {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentWordIds));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage', e);
  }
}

function addWordToRecent(wordId) {
  if (!wordId) return;
  // Move to front, max 8 items
  recentWordIds = [wordId, ...recentWordIds.filter(id => id !== wordId)].slice(0, 8);
  saveRecentToStorage();
  renderRecentBar();
}

function renderRecentBar() {
  if (!recentContainer || !recentChips) return;

  const isSearchEmpty = searchInput.value.trim() === '';
  if (!isSearchEmpty || recentWordIds.length === 0) {
    recentContainer.style.display = 'none';
    return;
  }

  const recentWords = recentWordIds
    .map(id => allWords.find(w => w.id === id))
    .filter(Boolean);

  if (recentWords.length === 0) {
    recentContainer.style.display = 'none';
    return;
  }

  recentChips.innerHTML = recentWords.map(w => `
    <button class="recent-chip" data-id="${w.id}">
      <span>${w.kanji}</span>
      <span class="recent-chip-reading">${w.hiragana}</span>
    </button>
  `).join('');

  recentContainer.style.display = 'flex';

  // Attach chip click handlers
  recentChips.querySelectorAll('.recent-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const word = allWords.find(w => w.id === id);
      if (word) openModal(word);
    });
  });
}

// Load dictionary from API
async function loadDictionary() {
  try {
    const res = await fetch('/api/dictionary');
    const data = await res.json();
    allWords = data.entries || [];
    currentFiltered = [...allWords];
    renderCards(currentFiltered);
    updateCategoryCounts();
    renderRecentBar();
  } catch (err) {
    console.error('Error al cargar datos del diccionario:', err);
    cardsGrid.innerHTML = `<div class="empty-state"><p>Error cargando los datos. Por favor recarga la página.</p></div>`;
  }
}

// Update counts on pills
function updateCategoryCounts() {
  const countAll = allWords.length;
  const countWord = allWords.filter(w => w.category === 'word').length;
  const countNoun = allWords.filter(w => w.category === 'noun').length;
  const countAdj = allWords.filter(w => w.category === 'adjective').length;

  document.getElementById('countAll').textContent = countAll;
  document.getElementById('countWord').textContent = countWord;
  document.getElementById('countNoun').textContent = countNoun;
  document.getElementById('countAdj').textContent = countAdj;
}

// Render cards
function renderCards(words) {
  if (words.length === 0) {
    cardsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    resultsCount.textContent = '0 resultados';
    return;
  }

  emptyState.style.display = 'none';
  cardsGrid.style.display = 'grid';

  const isSearchEmpty = searchInput.value.trim() === '';
  if (isSearchEmpty) {
    resultsCount.textContent = `Últimos resultados: ${words.length} palabras`;
  } else {
    resultsCount.textContent = `Resultados encontrados: ${words.length}`;
  }

  cardsGrid.innerHTML = words.map(w => `
    <article class="dict-card" data-id="${w.id}">
      <div class="dict-card-top">
        <div class="dict-card-headword">
          <span class="dict-kanji">${w.kanji}</span>
          <div class="dict-reading">
            <span class="dict-hiragana">${w.hiragana}</span>
            <span class="dict-romaji">${w.romaji}</span>
          </div>
        </div>
        <div class="dict-card-actions">
          <button class="card-play-btn" data-audio="${w.kanji}" title="Escuchar pronunciación" onclick="event.stopPropagation(); playJapaneseAudio('${w.kanji}', this)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </button>
        </div>
      </div>

      <div class="dict-card-meaning">${w.spanish}</div>

      <div class="dict-card-example">
        <span class="example-jp-mini">${w.example.japanese}</span>
        <span class="example-es-mini">${w.example.spanish}</span>
      </div>

      <div class="dict-card-footer">
        <span class="badge badge-category">${w.category_es}</span>
        <span class="badge badge-jlpt">${w.jlpt}</span>
      </div>
    </article>
  `).join('');

  // Attach card click handlers for modal
  document.querySelectorAll('.dict-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const word = allWords.find(w => w.id === id);
      if (word) {
        addWordToRecent(word.id);
        openModal(word);
      }
    });
  });
}

// Filter logic
function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  clearSearchBtn.style.display = query ? 'block' : 'none';

  currentFiltered = allWords.filter(w => {
    // Category match
    const categoryMatch = activeCategory === 'all' || w.category === activeCategory;
    
    // JLPT match
    const jlptMatch = activeJlpt === 'all' || w.jlpt === activeJlpt;

    // Search query match
    let searchMatch = true;
    if (query) {
      searchMatch = 
        w.kanji.toLowerCase().includes(query) ||
        w.hiragana.toLowerCase().includes(query) ||
        w.romaji.toLowerCase().includes(query) ||
        w.spanish.toLowerCase().includes(query) ||
        w.definitions.some(d => d.toLowerCase().includes(query)) ||
        w.example.japanese.includes(query) ||
        w.example.spanish.toLowerCase().includes(query);
    }

    return categoryMatch && jlptMatch && searchMatch;
  });

  renderCards(currentFiltered);
  renderRecentBar();
}

// Audio Player (Server TTS with Web Speech API fallback)
let currentAudio = null;

function playJapaneseAudio(text, triggerBtn = null) {
  if (!text) return;

  // Visual feedback on button
  if (triggerBtn) {
    triggerBtn.classList.add('is-playing');
    setTimeout(() => triggerBtn.classList.remove('is-playing'), 1500);
  }

  // 1. Try server-side native audio stream (/api/tts)
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  const audioUrl = `/api/tts?q=${encodeURIComponent(text)}`;
  const audio = new Audio(audioUrl);
  currentAudio = audio;

  audio.play().catch(err => {
    console.warn('Fallo al reproducir audio del servidor, usando SpeechSynthesis como respaldo:', err);
    // 2. Fallback to browser SpeechSynthesis
    playWebSpeechFallback(text);
  });
}

function playWebSpeechFallback(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('La síntesis de voz no es soportada en este navegador.');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.85;

  const voices = window.speechSynthesis.getVoices();
  const jpVoice = voices.find(v => v.lang && (v.lang.startsWith('ja') || v.lang === 'ja-JP'));
  if (jpVoice) {
    utterance.voice = jpVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// Modal View
function openModal(word) {
  currentActiveWord = word;
  modalKanji.textContent = word.kanji;

  const kanjiBox = document.querySelector('.kanji-grid-box');
  if (kanjiBox) {
    const len = (word.kanji || '').length;
    kanjiBox.className = 'kanji-grid-box';
    if (len <= 1) {
      kanjiBox.classList.add('single-char', 'len-1');
    } else if (len === 2) {
      kanjiBox.classList.add('len-2');
    } else if (len === 3) {
      kanjiBox.classList.add('len-3');
    } else {
      kanjiBox.classList.add('len-4');
    }
  }

  modalHiragana.textContent = word.hiragana;
  modalRomaji.textContent = word.romaji;
  modalCategoryBadge.textContent = word.category_es;
  modalJlptBadge.textContent = word.jlpt;
  modalSpanish.textContent = word.spanish;

  modalDefinitions.innerHTML = word.definitions.map(d => `<li>${d}</li>`).join('');
  modalExampleJp.textContent = word.example.japanese;
  modalExampleRomaji.textContent = word.example.romaji;
  modalExampleEs.textContent = word.example.spanish;
  modalNotes.textContent = word.notes || 'Palabra de uso común en japonés cotidiano.';

  detailModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  detailModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  currentActiveWord = null;
}

// Event Listeners
function setupEventListeners() {
  // Search Input
  searchInput.addEventListener('input', applyFilters);
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    applyFilters();
    searchInput.focus();
  });

  // Clear Recent History
  if (clearRecentBtn) {
    clearRecentBtn.addEventListener('click', () => {
      recentWordIds = [];
      saveRecentToStorage();
      renderRecentBar();
    });
  }

  // Category Pills
  filterPills.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category');
      applyFilters();
    });
  });

  // JLPT Select
  jlptSelect.addEventListener('change', (e) => {
    activeJlpt = e.target.value;
    applyFilters();
  });

  // Modal events
  closeModalBtn.addEventListener('click', closeModal);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailModal.style.display === 'flex') {
      closeModal();
    }
  });

  modalAudioBtn.addEventListener('click', () => {
    if (currentActiveWord) {
      playJapaneseAudio(currentActiveWord.kanji, modalAudioBtn);
    }
  });
}
