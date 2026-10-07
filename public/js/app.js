// Murasaki no Jisho - Diccionario Japonés-Español (JMdict-Simplified)

let allLoadedWords = [];
let totalAvailable = 0;
let currentOffset = 0;
const PAGE_SIZE = 48;

let activeCategory = 'all';
let currentSearchQuery = '';
let searchDebounceTimer = null;
let recentWordIds = [];

const RECENT_STORAGE_KEY = 'murasaki_recent_words';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const cardsGrid = document.getElementById('cardsGrid');
const emptyState = document.getElementById('emptyState');
const resultsCount = document.getElementById('resultsCount');
const filterPills = document.getElementById('filterPills');
const loadMoreWrap = document.getElementById('loadMoreWrap');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreRemain = document.getElementById('loadMoreRemain');

// Recent Bar Elements
const recentContainer = document.getElementById('recentContainer');
const recentChips = document.getElementById('recentChips');
const clearRecentBtn = document.getElementById('clearRecentBtn');

// Word Detail Modal Elements
const detailModal = document.getElementById('detailModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalKanji = document.getElementById('modalKanji');
const modalHiragana = document.getElementById('modalHiragana');
const modalRomaji = document.getElementById('modalRomaji');
const modalCategoryBadge = document.getElementById('modalCategoryBadge');
const modalCommonBadge = document.getElementById('modalCommonBadge');
const modalSpanish = document.getElementById('modalSpanish');
const modalDefinitions = document.getElementById('modalDefinitions');
const modalAudioBtn = document.getElementById('modalAudioBtn');

// Credits Modal Elements
const creditsModal = document.getElementById('creditsModal');
const openCreditsBtn = document.getElementById('openCreditsBtn');
const closeCreditsBtn = document.getElementById('closeCreditsBtn');

let currentActiveWord = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  loadRecentFromStorage();
  await loadStats();
  await searchDictionary(true);
  setupEventListeners();
});

// Load stats from API
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data) {
      const elAll = document.getElementById('countAll');
      const elVerb = document.getElementById('countVerb');
      const elNoun = document.getElementById('countNoun');
      const elAdj = document.getElementById('countAdj');
      const elExp = document.getElementById('countExp');

      if (elAll && data.total) elAll.textContent = Number(data.total).toLocaleString('es-ES');
      if (elVerb && data.verbsCount) elVerb.textContent = Number(data.verbsCount).toLocaleString('es-ES');
      if (elNoun && data.nounsCount) elNoun.textContent = Number(data.nounsCount).toLocaleString('es-ES');
      if (elAdj && data.adjectivesCount) elAdj.textContent = Number(data.adjectivesCount).toLocaleString('es-ES');
      if (elExp && data.expressionsCount) elExp.textContent = Number(data.expressionsCount).toLocaleString('es-ES');
    }
  } catch (err) {
    console.warn('No se pudieron cargar las estadísticas:', err);
  }
}

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
    console.warn('Error guardando en localStorage:', e);
  }
}

function addWordToRecent(word) {
  if (!word || !word.id) return;
  recentWordIds = [
    { id: word.id, kanji: word.kanji, hiragana: word.hiragana },
    ...recentWordIds.filter(item => (typeof item === 'object' ? item.id !== word.id : item !== word.id))
  ].slice(0, 8);

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

  recentChips.innerHTML = recentWordIds.map(item => {
    const id = typeof item === 'object' ? item.id : item;
    const kanji = typeof item === 'object' ? item.kanji : id;
    const reading = typeof item === 'object' ? item.hiragana : '';
    return `
      <button class="recent-chip" data-id="${id}">
        <span>${kanji}</span>
        ${reading ? `<span class="recent-chip-reading">${reading}</span>` : ''}
      </button>
    `;
  }).join('');

  recentContainer.style.display = 'flex';

  recentChips.querySelectorAll('.recent-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      await openModalById(id);
    });
  });
}

// Core Dictionary API Search
async function searchDictionary(reset = false) {
  if (reset) {
    currentOffset = 0;
    allLoadedWords = [];
  }

  const q = currentSearchQuery.trim();
  const category = activeCategory;
  const limit = PAGE_SIZE;
  const offset = currentOffset;

  const url = `/api/dictionary?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&limit=${limit}&offset=${offset}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    totalAvailable = data.total || 0;
    const newEntries = data.entries || [];

    if (reset) {
      allLoadedWords = newEntries;
    } else {
      allLoadedWords = [...allLoadedWords, ...newEntries];
    }

    currentOffset = allLoadedWords.length;
    renderCards(allLoadedWords);
    updateLoadMoreButton();
    renderRecentBar();
  } catch (err) {
    console.error('Error consultando el diccionario:', err);
    cardsGrid.innerHTML = `<div class="empty-state"><p>Error cargando los datos. Por favor recarga la página.</p></div>`;
  }
}

function updateLoadMoreButton() {
  if (!loadMoreWrap) return;
  const remaining = totalAvailable - allLoadedWords.length;
  if (remaining > 0) {
    loadMoreWrap.style.display = 'block';
    loadMoreRemain.textContent = remaining.toLocaleString('es-ES');
  } else {
    loadMoreWrap.style.display = 'none';
  }
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

  const isSearchEmpty = currentSearchQuery.trim() === '';
  if (isSearchEmpty) {
    resultsCount.textContent = `Últimos resultados: mostrando ${words.length} de ${totalAvailable.toLocaleString('es-ES')} palabras`;
  } else {
    resultsCount.textContent = `Resultados para "${currentSearchQuery}": ${totalAvailable.toLocaleString('es-ES')} encontradas`;
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

      <div class="dict-card-definitions">
        ${w.definitions && w.definitions.length > 1 ? `
          <ul class="mini-defs-list">
            ${w.definitions.slice(1, 3).map(d => `<li>${d}</li>`).join('')}
          </ul>
        ` : ''}
      </div>

      <div class="dict-card-footer">
        <span class="badge badge-category">${w.category_es}</span>
        ${w.common ? `<span class="badge badge-common">Común</span>` : `<span class="badge badge-general">General</span>`}
      </div>
    </article>
  `).join('');

  // Attach card click handlers for modal
  document.querySelectorAll('.dict-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const word = allLoadedWords.find(w => w.id === id);
      if (word) {
        addWordToRecent(word);
        openModal(word);
      }
    });
  });
}

// Audio Player (Server TTS with Web Speech API fallback)
let currentAudio = null;

function playJapaneseAudio(text, triggerBtn = null) {
  if (!text) return;

  if (triggerBtn) {
    triggerBtn.classList.add('is-playing');
    setTimeout(() => triggerBtn.classList.remove('is-playing'), 1500);
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  const audioUrl = `/api/tts?q=${encodeURIComponent(text)}`;
  const audio = new Audio(audioUrl);
  currentAudio = audio;

  audio.play().catch(err => {
    console.warn('Fallo al reproducir audio del servidor, probando síntesis web:', err);
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

// Modal View by ID
async function openModalById(id) {
  let word = allLoadedWords.find(w => w.id === id);
  if (!word) {
    try {
      const res = await fetch(`/api/dictionary/${id}`);
      if (res.ok) word = await res.json();
    } catch (e) {}
  }
  if (word) {
    addWordToRecent(word);
    openModal(word);
  }
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
  modalCommonBadge.textContent = word.common ? 'Común (Frecuencia alta)' : 'Vocabulario general';
  modalSpanish.textContent = word.spanish;

  modalDefinitions.innerHTML = (word.definitions || [word.spanish]).map(d => `<li>${d}</li>`).join('');

  detailModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  detailModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  currentActiveWord = null;
}

// Credits Modal
function openCredits() {
  creditsModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCredits() {
  creditsModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Event Listeners
function setupEventListeners() {
  // Search Input with Debounce (250ms)
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    clearSearchBtn.style.display = val.trim() ? 'block' : 'none';

    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentSearchQuery = val;
      searchDictionary(true);
    }, 250);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchDictionary(true);
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

  // Load More Button
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      searchDictionary(false);
    });
  }

  // Category Pills
  filterPills.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category');
      searchDictionary(true);
    });
  });

  // Word Detail Modal events
  closeModalBtn.addEventListener('click', closeModal);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeModal();
  });

  // Credits Modal events
  if (openCreditsBtn) openCreditsBtn.addEventListener('click', openCredits);
  if (closeCreditsBtn) closeCreditsBtn.addEventListener('click', closeCredits);
  if (creditsModal) {
    creditsModal.addEventListener('click', (e) => {
      if (e.target === creditsModal) closeCredits();
    });
  }

  // Header link to credits
  const attributionHeaderLink = document.getElementById('attributionHeaderLink');
  if (attributionHeaderLink) {
    attributionHeaderLink.addEventListener('click', (e) => {
      e.preventDefault();
      openCredits();
    });
  }

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (detailModal.style.display === 'flex') closeModal();
      if (creditsModal && creditsModal.style.display === 'flex') closeCredits();
    }
  });

  modalAudioBtn.addEventListener('click', () => {
    if (currentActiveWord) {
      playJapaneseAudio(currentActiveWord.kanji, modalAudioBtn);
    }
  });
}
