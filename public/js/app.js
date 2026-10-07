// Murasaki no Jisho - Diccionario Japonés-Español (JMdict-Simplified, KANJIDIC2, Tatoeba)
// Sistema interactivo estilo Jisho.org: /word/:kanji, /kanji/:char, /search/:query

let allLoadedWords = [];
let totalAvailable = 0;
let currentOffset = 0;
const PAGE_SIZE = 48;

let activeCategory = 'all';
let activeJlpt = 'all';
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
const jlptSelect = document.getElementById('jlptSelect');
const deinflectBanner = document.getElementById('deinflectBanner');
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
const modalJlptBadge = document.getElementById('modalJlptBadge');
const modalCommonBadge = document.getElementById('modalCommonBadge');
const modalSpanish = document.getElementById('modalSpanish');
const modalDefinitions = document.getElementById('modalDefinitions');
const modalAudioBtn = document.getElementById('modalAudioBtn');
const modalKanjiLinksRow = document.getElementById('modalKanjiLinksRow');
const modalKanjiLinksList = document.getElementById('modalKanjiLinksList');
const modalSentencesSection = document.getElementById('modalSentencesSection');
const modalSentencesList = document.getElementById('modalSentencesList');

// Kanji Detail Modal Elements
const kanjiModal = document.getElementById('kanjiModal');
const closeKanjiModalBtn = document.getElementById('closeKanjiModalBtn');
const kmLiteral = document.getElementById('kmLiteral');
const kmJlpt = document.getElementById('kmJlpt');
const kmGrade = document.getElementById('kmGrade');
const kmStrokes = document.getElementById('kmStrokes');
const kmRadical = document.getElementById('kmRadical');
const kmMeanings = document.getElementById('kmMeanings');
const kmOnReadings = document.getElementById('kmOnReadings');
const kmKunReadings = document.getElementById('kmKunReadings');
const kmStrokeContainer = document.getElementById('kmStrokeContainer');
const kmAnimateStrokesBtn = document.getElementById('kmAnimateStrokesBtn');
const kmSearchWordsBtn = document.getElementById('kmSearchWordsBtn');

// Credits Modal Elements
const creditsModal = document.getElementById('creditsModal');
const openCreditsBtn = document.getElementById('openCreditsBtn');
const closeCreditsBtn = document.getElementById('closeCreditsBtn');

let currentActiveWord = null;
let currentActiveKanji = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  loadRecentFromStorage();
  await loadStats();
  setupEventListeners();
  await handleInitialRoute();
});

// Route Handler on page startup
async function handleInitialRoute() {
  const path = window.location.pathname;

  // 1. Direct Kanji route (__INITIAL_KANJI__ or /kanji/:char)
  if (window.__INITIAL_KANJI__) {
    const k = window.__INITIAL_KANJI__;
    renderKanjiModalData(k);
    kanjiModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    await searchDictionary(true, false);
    return;
  }

  const kanjiMatch = path.match(/^\/kanji\/(.+)$/);
  if (kanjiMatch) {
    const char = decodeURIComponent(kanjiMatch[1]);
    await searchDictionary(true, false);
    await openKanjiModal(char, false);
    return;
  }

  // 2. Direct Word URL from server injection (__INITIAL_WORD__)
  if (window.__INITIAL_WORD__) {
    const word = window.__INITIAL_WORD__;
    addWordToRecent(word);
    openModal(word, false);
    await searchDictionary(true, false);
    return;
  }

  // 3. Direct /word/:slug or /palabra/:slug
  const wordMatch = path.match(/^\/(?:word|palabra)\/(.+)$/);
  if (wordMatch) {
    const term = decodeURIComponent(wordMatch[1]);
    await searchDictionary(true, false);
    await openWordByTerm(term, false);
    return;
  }

  // 4. Direct /search/:query or query parameter ?q=
  let initialQ = window.__INITIAL_SEARCH__ || '';
  if (!initialQ) {
    const searchMatch = path.match(/^\/search\/(.+)$/);
    if (searchMatch) {
      initialQ = decodeURIComponent(searchMatch[1]);
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('q')) {
        initialQ = urlParams.get('q');
      }
    }
  }

  if (initialQ) {
    searchInput.value = initialQ;
    currentSearchQuery = initialQ;
    clearSearchBtn.style.display = 'block';
    await searchDictionary(true, false);
    return;
  }

  // Default: load home list
  await searchDictionary(true, false);
}

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
      const elKanji = document.getElementById('countKanji');

      if (elAll && data.total) elAll.textContent = Number(data.total).toLocaleString('es-ES');
      if (elVerb && data.verbsCount) elVerb.textContent = Number(data.verbsCount).toLocaleString('es-ES');
      if (elNoun && data.nounsCount) elNoun.textContent = Number(data.nounsCount).toLocaleString('es-ES');
      if (elAdj && data.adjectivesCount) elAdj.textContent = Number(data.adjectivesCount).toLocaleString('es-ES');
      if (elExp && data.expressionsCount) elExp.textContent = Number(data.expressionsCount).toLocaleString('es-ES');
      if (elKanji && data.kanjiCount) elKanji.textContent = Number(data.kanjiCount).toLocaleString('es-ES');
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
    const wordSlug = kanji || id;
    return `
      <a class="recent-chip" href="/word/${encodeURIComponent(wordSlug)}" data-id="${id}" data-slug="${encodeURIComponent(wordSlug)}">
        <span>${kanji}</span>
        ${reading ? `<span class="recent-chip-reading">${reading}</span>` : ''}
      </a>
    `;
  }).join('');

  recentContainer.style.display = 'flex';

  recentChips.querySelectorAll('.recent-chip').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      const slug = decodeURIComponent(btn.getAttribute('data-slug'));
      await openWordByTerm(slug, true);
    });
  });
}

// Core Dictionary API Search
async function searchDictionary(reset = false, updateUrl = true) {
  if (reset) {
    currentOffset = 0;
    allLoadedWords = [];
  }

  const q = currentSearchQuery.trim();
  const category = activeCategory;
  const jlpt = activeJlpt;
  const limit = PAGE_SIZE;
  const offset = currentOffset;

  if (updateUrl && !currentActiveWord && !currentActiveKanji) {
    if (q) {
      const searchUrl = `/search/${encodeURIComponent(q)}`;
      if (window.location.pathname !== searchUrl) {
        history.replaceState({ type: 'search', q }, `Buscar "${q}" - Diccionario Japonés-Español | Murasaki no Jisho`, searchUrl);
        document.title = `Buscar "${q}" - Diccionario Japonés-Español | Murasaki no Jisho`;
      }
    } else {
      if (window.location.pathname !== '/') {
        history.replaceState({ type: 'home' }, 'Murasaki no Jisho | Diccionario Japonés-Español', '/');
        document.title = 'Murasaki no Jisho | Diccionario Japonés-Español';
      }
    }
  }

  // 1. Modo Especial: Búsqueda de Kanjis
  if (category === 'kanji') {
    deinflectBanner.style.display = 'none';
    let url = `/api/kanjis?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
    if (jlpt && jlpt !== 'all') {
      url += `&jlpt=${encodeURIComponent(jlpt)}`;
    }

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
      renderKanjiCards(allLoadedWords);
      updateLoadMoreButton();
      renderRecentBar();
    } catch (err) {
      console.error('Error consultando kanjis:', err);
      cardsGrid.innerHTML = `<div class="empty-state"><p>Error cargando los kanjis. Por favor recarga la página.</p></div>`;
    }
    return;
  }

  // 2. Modo Normal: Búsqueda de Palabras
  let url = `/api/dictionary?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&limit=${limit}&offset=${offset}`;
  if (jlpt && jlpt !== 'all') {
    url += `&jlpt=${encodeURIComponent(jlpt)}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    totalAvailable = data.total || 0;
    const newEntries = data.entries || [];

    // Handle Deinflection Banner
    if (data.deinflection && q) {
      deinflectBanner.innerHTML = `
        <span class="deinflect-icon">💡</span>
        <span>Forma conjugada detectada: <strong>${data.deinflection.original}</strong> es la forma <em>${data.deinflection.form}</em> de <strong>${data.deinflection.base}</strong></span>
      `;
      deinflectBanner.style.display = 'flex';
    } else {
      deinflectBanner.style.display = 'none';
    }

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

// Render cards de Palabras
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

  cardsGrid.innerHTML = words.map(w => {
    const wordSlug = w.kanji || w.id;
    return `
      <article class="dict-card" data-id="${w.id}" data-slug="${encodeURIComponent(wordSlug)}">
        <div class="dict-card-top">
          <div class="dict-card-headword">
            <a href="/word/${encodeURIComponent(wordSlug)}" class="dict-card-link" onclick="event.preventDefault();">
              <span class="dict-kanji">${w.kanji}</span>
              <div class="dict-reading">
                <span class="dict-hiragana">${w.hiragana}</span>
                <span class="dict-romaji">${w.romaji}</span>
              </div>
            </a>
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
          ${w.jlpt ? `<span class="badge badge-jlpt">${w.jlpt}</span>` : ''}
          ${w.common ? `<span class="badge badge-common">Común</span>` : `<span class="badge badge-general">General</span>`}
        </div>
      </article>
    `;
  }).join('');

  cardsGrid.querySelectorAll('.dict-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-play-btn')) return;
      const id = card.getAttribute('data-id');
      const word = allLoadedWords.find(w => w.id === id);
      if (word) {
        addWordToRecent(word);
        openModal(word, true);
      }
    });
  });
}

// Render cards de Kanjis
function renderKanjiCards(kanjis) {
  if (kanjis.length === 0) {
    cardsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    resultsCount.textContent = '0 kanjis encontrados';
    return;
  }

  emptyState.style.display = 'none';
  cardsGrid.style.display = 'grid';

  const isSearchEmpty = currentSearchQuery.trim() === '';
  if (isSearchEmpty) {
    resultsCount.textContent = `Mostrando ${kanjis.length} de ${totalAvailable.toLocaleString('es-ES')} kanjis disponibles`;
  } else {
    resultsCount.textContent = `Kanjis para "${currentSearchQuery}": ${totalAvailable.toLocaleString('es-ES')} encontrados`;
  }

  cardsGrid.innerHTML = kanjis.map(k => {
    const onStr = (k.onReadings && k.onReadings.length > 0) ? k.onReadings.slice(0, 3).join(', ') : '';
    const kunStr = (k.kunReadings && k.kunReadings.length > 0) ? k.kunReadings.slice(0, 3).join(', ') : '';
    const readings = [onStr, kunStr].filter(Boolean).join(' • ');
    const meaning = (k.meaningsEs && k.meaningsEs.length > 0) ? k.meaningsEs.join(', ') : (k.meaningsEn ? k.meaningsEn.join(', ') : '-');

    return `
      <article class="kanji-card" data-char="${k.literal}">
        <div class="kanji-card-char">${k.literal}</div>
        ${readings ? `<div class="kanji-card-readings">${readings}</div>` : ''}
        <div class="kanji-card-meaning">${meaning}</div>
        <div class="kanji-card-footer">
          <span class="badge badge-strokes">${k.strokes} trazos</span>
          ${k.jlpt ? `<span class="badge badge-jlpt">${k.jlpt}</span>` : ''}
          ${k.grade ? `<span class="badge badge-grade">Gr. ${k.grade}</span>` : ''}
        </div>
      </article>
    `;
  }).join('');

  cardsGrid.querySelectorAll('.kanji-card').forEach(card => {
    card.addEventListener('click', () => {
      const char = card.getAttribute('data-char');
      openKanjiModal(char, true);
    });
  });
}

// Audio Player
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
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const jpVoice = voices.find(v => v.lang && (v.lang.startsWith('ja') || v.lang === 'ja-JP'));
  if (jpVoice) utterance.voice = jpVoice;
  window.speechSynthesis.speak(utterance);
}

// Modal View by Word identifier / term
async function openWordByTerm(term, shouldPushState = true) {
  let word = allLoadedWords.find(w => w.kanji === term || w.id === term || w.hiragana === term);
  if (!word) {
    try {
      const res = await fetch(`/api/dictionary/word/${encodeURIComponent(term)}`);
      if (res.ok) {
        word = await res.json();
      }
    } catch (e) {
      console.warn('Error buscando palabra por término:', e);
    }
  }

  if (word) {
    addWordToRecent(word);
    openModal(word, shouldPushState);
  }
}

// Modal View with Jisho.org URL pushState
async function openModal(word, shouldPushState = true) {
  currentActiveWord = word;
  modalKanji.textContent = word.kanji;

  const kanjiBox = document.getElementById('modalKanjiBox');
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

  if (word.jlpt) {
    modalJlptBadge.textContent = word.jlpt;
    modalJlptBadge.style.display = 'inline-block';
  } else {
    modalJlptBadge.style.display = 'none';
  }

  modalCommonBadge.textContent = word.common ? 'Común (Frecuencia alta)' : 'Vocabulario general';
  modalSpanish.textContent = word.spanish;
  modalDefinitions.innerHTML = (word.definitions || [word.spanish]).map(d => `<li>${d}</li>`).join('');

  // Extract individual kanjis for quick inspection chips
  const kanjis = (word.kanji || '').match(/[\u4e00-\u9faf]/g) || [];
  if (kanjis.length > 0) {
    modalKanjiLinksList.innerHTML = [...new Set(kanjis)].map(k => `
      <a href="/kanji/${encodeURIComponent(k)}" class="kanji-link-chip" data-char="${k}" title="Ver orden de trazos y datos de ${k}">
        ${k} 🖌️
      </a>
    `).join('');
    modalKanjiLinksRow.style.display = 'flex';

    modalKanjiLinksList.querySelectorAll('.kanji-link-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        const char = chip.getAttribute('data-char');
        openKanjiModal(char, true);
      });
    });
  } else {
    modalKanjiLinksRow.style.display = 'none';
  }

  // Handle Tatoeba example sentences
  let sentences = word.sentences || [];
  if (sentences.length === 0) {
    try {
      const sentRes = await fetch(`/api/sentences?q=${encodeURIComponent(word.kanji || word.hiragana)}`);
      if (sentRes.ok) {
        const sentData = await sentRes.json();
        sentences = (sentData.sentences || []).slice(0, 3);
      }
    } catch (e) {}
  }

  if (sentences.length > 0) {
    modalSentencesList.innerHTML = sentences.map(s => `
      <div class="sentence-item">
        <div class="sentence-jp-row">
          <span class="sentence-jp">${s.japanese}</span>
          <button class="sentence-audio-btn" title="Escuchar frase" onclick="playJapaneseAudio('${s.japanese.replace(/'/g, "\\'")}', this)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </button>
        </div>
        <div class="sentence-es">${s.spanish}</div>
      </div>
    `).join('');
    modalSentencesSection.style.display = 'block';
  } else {
    modalSentencesSection.style.display = 'none';
  }

  detailModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const wordSlug = word.kanji || word.id;
  const wordUrl = `/word/${encodeURIComponent(wordSlug)}`;
  const title = `${word.kanji} (${word.hiragana}) - Diccionario Japonés-Español | Murasaki no Jisho`;
  document.title = title;

  if (shouldPushState && window.location.pathname !== wordUrl) {
    history.pushState({ type: 'word', slug: wordSlug }, title, wordUrl);
  }
}

function closeModal(shouldPushState = true) {
  detailModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  currentActiveWord = null;

  const q = currentSearchQuery.trim();
  let returnUrl = '/';
  let title = 'Murasaki no Jisho | Diccionario Japonés-Español';
  if (q) {
    returnUrl = `/search/${encodeURIComponent(q)}`;
    title = `Buscar "${q}" - Diccionario Japonés-Español | Murasaki no Jisho`;
  }

  document.title = title;
  if (shouldPushState && window.location.pathname !== returnUrl) {
    history.pushState({ type: q ? 'search' : 'home' }, title, returnUrl);
  }
}

// Dedicated Kanji Modal with KanjiVG Stroke Diagram
async function openKanjiModal(char, shouldPushState = true) {
  try {
    const res = await fetch(`/api/kanji/${encodeURIComponent(char)}`);
    if (!res.ok) return;
    const k = await res.json();
    renderKanjiModalData(k);

    kanjiModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const kanjiUrl = `/kanji/${encodeURIComponent(char)}`;
    const title = `Kanji ${k.literal} - Trazos, lecturas y significado | Murasaki no Jisho`;
    document.title = title;

    if (shouldPushState && window.location.pathname !== kanjiUrl) {
      history.pushState({ type: 'kanji', char }, title, kanjiUrl);
    }
  } catch (e) {
    console.error('Error abriendo modal de kanji:', e);
  }
}

function renderKanjiModalData(k) {
  currentActiveKanji = k;
  kmLiteral.textContent = k.literal;
  kmJlpt.textContent = k.jlpt ? `JLPT ${k.jlpt}` : 'JLPT: -';
  kmGrade.textContent = k.grade ? `Grado ${k.grade}` : 'General';
  kmStrokes.textContent = `${k.strokes || '-'} trazos`;
  kmRadical.textContent = k.radical ? `Radical: #${k.radical}` : '';

  const meanings = (k.meaningsEs && k.meaningsEs.length > 0) ? k.meaningsEs.join(', ') : (k.meaningsEn ? k.meaningsEn.join(', ') : '-');
  kmMeanings.textContent = meanings;

  kmOnReadings.textContent = (k.onReadings && k.onReadings.length > 0) ? k.onReadings.join(', ') : '-';
  kmKunReadings.textContent = (k.kunReadings && k.kunReadings.length > 0) ? k.kunReadings.join(', ') : '-';

  // Load KanjiVG Stroke Order Diagram
  if (kmStrokeContainer) {
    kmStrokeContainer.innerHTML = '<span class="stroke-loading">Cargando diagrama de trazos (KanjiVG)...</span>';
    fetch(`/api/kanji/${encodeURIComponent(k.literal)}/stroke-order`)
      .then(res => {
        if (!res.ok) throw new Error('Diagrama no disponible');
        return res.text();
      })
      .then(svgText => {
        kmStrokeContainer.innerHTML = svgText;
      })
      .catch(() => {
        kmStrokeContainer.innerHTML = '<span class="stroke-loading">Diagrama de trazos no disponible para este kanji</span>';
      });
  }

  // Animate Strokes Button
  if (kmAnimateStrokesBtn) {
    kmAnimateStrokesBtn.onclick = () => {
      animateKanjiStrokes();
    };
  }

  kmSearchWordsBtn.onclick = () => {
    closeKanjiModal(false);
    if (detailModal.style.display === 'flex') closeModal(false);
    searchInput.value = k.literal;
    currentSearchQuery = k.literal;
    clearSearchBtn.style.display = 'block';
    searchDictionary(true, true);
  };
}

function animateKanjiStrokes() {
  if (!kmStrokeContainer) return;
  const svg = kmStrokeContainer.querySelector('svg');
  if (!svg) return;

  const paths = svg.querySelectorAll('path');
  if (!paths.length) return;

  paths.forEach((p, index) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.style.transition = 'none';

    setTimeout(() => {
      p.style.transition = 'stroke-dashoffset 0.45s ease-in-out';
      p.style.strokeDashoffset = '0';
    }, index * 380);
  });
}

function closeKanjiModal(shouldPushState = true) {
  kanjiModal.style.display = 'none';
  currentActiveKanji = null;

  if (detailModal.style.display === 'flex') {
    return;
  }

  document.body.style.overflow = 'auto';
  const q = currentSearchQuery.trim();
  let returnUrl = '/';
  let title = 'Murasaki no Jisho | Diccionario Japonés-Español';
  if (q) {
    returnUrl = `/search/${encodeURIComponent(q)}`;
    title = `Buscar "${q}" - Diccionario Japonés-Español | Murasaki no Jisho`;
  }

  document.title = title;
  if (shouldPushState && window.location.pathname !== returnUrl) {
    history.pushState({ type: q ? 'search' : 'home' }, title, returnUrl);
  }
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
      searchDictionary(true, true);
    }, 250);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchDictionary(true, true);
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
      searchDictionary(false, false);
    });
  }

  // Category Pills (includes Kanjis)
  filterPills.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category');
      searchDictionary(true, false);
    });
  });

  // JLPT Level Selector
  if (jlptSelect) {
    jlptSelect.addEventListener('change', () => {
      activeJlpt = jlptSelect.value;
      searchDictionary(true, false);
    });
  }

  // Word Detail Modal events
  closeModalBtn.addEventListener('click', () => closeModal(true));
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeModal(true);
  });

  // Kanji Modal events
  if (closeKanjiModalBtn) closeKanjiModalBtn.addEventListener('click', () => closeKanjiModal(true));
  if (kanjiModal) {
    kanjiModal.addEventListener('click', (e) => {
      if (e.target === kanjiModal) closeKanjiModal(true);
    });
  }

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

  // Browser Navigation: Popstate
  window.addEventListener('popstate', async (e) => {
    const path = window.location.pathname;

    const kanjiMatch = path.match(/^\/kanji\/(.+)$/);
    if (kanjiMatch) {
      const char = decodeURIComponent(kanjiMatch[1]);
      await openKanjiModal(char, false);
      return;
    }

    if (kanjiModal && kanjiModal.style.display === 'flex') {
      closeKanjiModal(false);
    }

    const wordMatch = path.match(/^\/(?:word|palabra)\/(.+)$/);
    if (wordMatch) {
      const term = decodeURIComponent(wordMatch[1]);
      await openWordByTerm(term, false);
      return;
    }

    if (detailModal.style.display === 'flex') {
      closeModal(false);
    }

    const searchMatch = path.match(/^\/search\/(.+)$/);
    if (searchMatch) {
      const q = decodeURIComponent(searchMatch[1]);
      if (searchInput.value !== q) {
        searchInput.value = q;
        currentSearchQuery = q;
        clearSearchBtn.style.display = 'block';
        await searchDictionary(true, false);
      }
    } else {
      if (searchInput.value !== '') {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        await searchDictionary(true, false);
      }
    }
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (kanjiModal && kanjiModal.style.display === 'flex') closeKanjiModal(true);
      else if (detailModal.style.display === 'flex') closeModal(true);
      else if (creditsModal && creditsModal.style.display === 'flex') closeCredits();
    }
  });

  modalAudioBtn.addEventListener('click', () => {
    if (currentActiveWord) {
      playJapaneseAudio(currentActiveWord.kanji, modalAudioBtn);
    }
  });
}
