// scripts/build-db.js
// Compilador completo de base de datos SQLite para Murasaki no Jisho:
// 1. JMdict-Simplified (34.309 entradas en español con niveles JLPT N5-N1)
// 2. KANJIDIC2 (13.108 carácteres kanji con trazos, radicales, lecturas On/Kun y significados)
// 3. Tatoeba (39.748 oraciones de ejemplo bilingües japonés <-> español)

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const KANA_MAP = {
  // Hiragana
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'me': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'o', 'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
  // Katakana
  'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
  'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
  'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
  'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
  'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
  'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
  'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
  'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
  'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
  'ワ': 'wa', 'ヲ': 'o', 'ン': 'n',
  'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
  'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
  'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
  'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
  'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
  'キャ': 'kya', 'キュ': 'kyu', 'キョ': 'kyo',
  'シャ': 'sha', 'シュ': 'shu', 'ショ': 'sho',
  'チャ': 'cha', 'チュ': 'chu', 'チョ': 'cho',
  'ニャ': 'nya', 'ニュ': 'nyu', 'ニョ': 'nyo',
  'ヒャ': 'hya', 'ヒュ': 'hyu', 'ヒョ': 'hyo',
  'ミャ': 'mya', 'ミュ': 'myu', 'ミョ': 'myo',
  'リャ': 'rya', 'リュ': 'ryu', 'リョ': 'ryo',
  'ギャ': 'gya', 'ギュ': 'gyu', 'ギョ': 'gyo',
  'ジャ': 'ja', 'ジュ': 'ju', 'ジョ': 'jo',
  'ビャ': 'bya', 'ビュ': 'byu', 'ビョ': 'byo',
  'ピャ': 'pya', 'ピュ': 'pyu', 'ピョ': 'pyo',
  'ー': ''
};

function kanaToRomaji(kana) {
  if (!kana) return '';
  let res = '';
  let i = 0;
  while (i < kana.length) {
    if (kana[i] === 'っ' || kana[i] === 'ッ') {
      const nextPair = kana.substr(i + 1, 2);
      const nextChar = kana.substr(i + 1, 1);
      const nextRom = KANA_MAP[nextPair] || KANA_MAP[nextChar];
      if (nextRom) {
        res += nextRom[0];
      }
      i++;
      continue;
    }

    const two = kana.substr(i, 2);
    if (KANA_MAP[two]) {
      res += KANA_MAP[two];
      i += 2;
      continue;
    }

    const one = kana[i];
    if (KANA_MAP[one]) {
      res += KANA_MAP[one];
    } else {
      res += one;
    }
    i++;
  }
  return res;
}

function mapPosToCategory(posList) {
  if (!posList || posList.length === 0) return { category: 'other', category_es: 'General' };
  const pos = posList.join(' ');
  if (pos.includes('exp')) return { category: 'expression', category_es: 'Expresión' };
  if (/v1|v5|vk|vs|vz|v-/.test(pos) || pos.startsWith('v ') || pos === 'v') {
    if (pos.includes('v1')) return { category: 'verb', category_es: 'Verbo (Ichidan)' };
    if (pos.includes('v5')) return { category: 'verb', category_es: 'Verbo (Godan)' };
    if (pos.includes('vk')) return { category: 'verb', category_es: 'Verbo (Kuru)' };
    if (pos.includes('vs')) return { category: 'verb', category_es: 'Verbo (Suru)' };
    return { category: 'verb', category_es: 'Verbo' };
  }
  if (pos.includes('adj-i')) return { category: 'adjective', category_es: 'Adjetivo (I)' };
  if (pos.includes('adj-na')) return { category: 'adjective', category_es: 'Adjetivo (Na)' };
  if (pos.includes('adj-')) return { category: 'adjective', category_es: 'Adjetivo' };
  if (pos.includes('n')) return { category: 'noun', category_es: 'Sustantivo' };
  if (pos.includes('adv')) return { category: 'other', category_es: 'Adverbio' };
  return { category: 'other', category_es: 'General' };
}

async function buildDatabase() {
  const dbPath = path.join(__dirname, '..', 'data', 'dictionary.db');
  console.log('==> Iniciando compilación de base de datos SQLite:', dbPath);

  if (fs.existsSync(dbPath)) {
    try { fs.unlinkSync(dbPath); } catch (e) {}
  }

  const db = new DatabaseSync(dbPath);

  // 1. ESQUEMAS
  db.exec(`
    -- Tabla de Palabras (JMdict + JLPT)
    CREATE TABLE words (
      id TEXT PRIMARY KEY,
      kanji TEXT,
      hiragana TEXT,
      romaji TEXT,
      spanish TEXT,
      category TEXT,
      category_es TEXT,
      common INTEGER,
      jlpt INTEGER,
      definitions_json TEXT,
      example_json TEXT,
      notes TEXT
    );

    CREATE INDEX idx_kanji ON words(kanji);
    CREATE INDEX idx_hiragana ON words(hiragana);
    CREATE INDEX idx_romaji ON words(romaji);
    CREATE INDEX idx_category ON words(category);
    CREATE INDEX idx_common ON words(common);
    CREATE INDEX idx_jlpt ON words(jlpt);

    -- Tabla de Kanji Dedicada (KANJIDIC2)
    CREATE TABLE kanjis (
      literal TEXT PRIMARY KEY,
      strokes INTEGER,
      grade INTEGER,
      freq INTEGER,
      jlpt INTEGER,
      radical INTEGER,
      on_readings_json TEXT,
      kun_readings_json TEXT,
      meanings_es_json TEXT,
      meanings_en_json TEXT,
      nanori_json TEXT
    );

    CREATE INDEX idx_kanjis_strokes ON kanjis(strokes);
    CREATE INDEX idx_kanjis_jlpt ON kanjis(jlpt);
    CREATE INDEX idx_kanjis_grade ON kanjis(grade);

    -- Tabla de Oraciones de Ejemplo (Tatoeba)
    CREATE TABLE sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jpn_id INTEGER,
      spa_id INTEGER,
      japanese TEXT,
      spanish TEXT
    );

    CREATE INDEX idx_sentences_jpn ON sentences(japanese);

    -- Índices de búsqueda FTS5
    CREATE VIRTUAL TABLE words_fts USING fts5(
      id UNINDEXED,
      kanji,
      hiragana,
      romaji,
      spanish
    );

    CREATE VIRTUAL TABLE sentences_fts USING fts5(
      id UNINDEXED,
      japanese,
      spanish
    );
  `);

  // 2. INSERTAR PALABRAS (JMdict + JLPT)
  console.log('==> Cargando datos de JLPT...');
  const jlptPath = path.join(__dirname, '..', 'data', 'jlpt_vocab.json');
  let jlptData = {};
  if (fs.existsSync(jlptPath)) {
    jlptData = JSON.parse(fs.readFileSync(jlptPath, 'utf8'));
  }

  console.log('==> Cargando jmdict-spa-3.6.2.json...');
  const jsonWordsPath = path.join(__dirname, '..', 'data', 'jmdict-spa-3.6.2.json');
  const wordsData = JSON.parse(fs.readFileSync(jsonWordsPath, 'utf8'));
  const wordsList = wordsData.words || [];

  const insertWord = db.prepare(`
    INSERT INTO words (
      id, kanji, hiragana, romaji, spanish, category, category_es, common, jlpt, definitions_json, example_json, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertWordFts = db.prepare(`
    INSERT INTO words_fts (id, kanji, hiragana, romaji, spanish) VALUES (?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION');
  let insertedWords = 0;
  for (const entry of wordsList) {
    const id = entry.id;
    const primaryKanjiObj = entry.kanji && entry.kanji[0];
    const primaryKanaObj = entry.kana && entry.kana[0];

    const kanjiText = primaryKanjiObj ? primaryKanjiObj.text : (primaryKanaObj ? primaryKanaObj.text : '');
    const kanaText = primaryKanaObj ? primaryKanaObj.text : '';
    const romajiText = kanaToRomaji(kanaText);
    const isCommon = (primaryKanjiObj && primaryKanjiObj.common) || (primaryKanaObj && primaryKanaObj.common) ? 1 : 0;

    const allGlosses = [];
    let posList = [];
    if (entry.sense) {
      for (const s of entry.sense) {
        if (s.partOfSpeech) posList.push(...s.partOfSpeech);
        if (s.gloss) {
          for (const g of s.gloss) {
            if (g.text && g.text.trim()) allGlosses.push(g.text.trim());
          }
        }
      }
    }
    if (allGlosses.length === 0) continue;

    const uniqueGlosses = [...new Set(allGlosses)];
    const primarySpanish = uniqueGlosses[0];
    const { category, category_es } = mapPosToCategory(posList);

    // Mapeo de JLPT si existe
    let jlptLevel = null;
    const jlptMatch = jlptData[kanjiText] || jlptData[kanaText];
    if (jlptMatch && jlptMatch[0] && jlptMatch[0].level) {
      jlptLevel = jlptMatch[0].level;
    }

    const definitionsJson = JSON.stringify(uniqueGlosses.slice(0, 6));

    insertWord.run(
      id,
      kanjiText,
      kanaText,
      romajiText,
      primarySpanish,
      category,
      category_es,
      isCommon,
      jlptLevel,
      definitionsJson,
      null,
      'Entrada oficial de JMdict (EDRDG)'
    );

    insertWordFts.run(id, kanjiText, kanaText, romajiText, uniqueGlosses.join(' '));
    insertedWords++;
  }
  db.exec('COMMIT');
  console.log(`==> Palabras insertadas: ${insertedWords}`);

  // 3. INSERTAR KANJIS (KANJIDIC2)
  const kanjiJsonPath = path.join(__dirname, '..', 'data', 'kanjidic2-all-3.6.2.json');
  if (fs.existsSync(kanjiJsonPath)) {
    console.log('==> Cargando KANJIDIC2 (13.108 kanji)...');
    const kanjiRaw = JSON.parse(fs.readFileSync(kanjiJsonPath, 'utf8'));
    const characters = kanjiRaw.characters || [];

    const insertKanji = db.prepare(`
      INSERT INTO kanjis (
        literal, strokes, grade, freq, jlpt, radical, on_readings_json, kun_readings_json, meanings_es_json, meanings_en_json, nanori_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION');
    let insertedKanji = 0;
    for (const c of characters) {
      const literal = c.literal;
      const strokes = (c.misc && c.misc.strokeCounts && c.misc.strokeCounts[0]) || null;
      const grade = (c.misc && c.misc.grade) || null;
      const freq = (c.misc && c.misc.frequency) || null;
      const jlpt = (c.misc && c.misc.jlptLevel) || null;
      const radical = (c.radicals && c.radicals[0] && c.radicals[0].value) || null;

      const onReadings = [];
      const kunReadings = [];
      const meaningsEs = [];
      const meaningsEn = [];
      const nanori = c.readingMeaning ? (c.readingMeaning.nanori || []) : [];

      if (c.readingMeaning && c.readingMeaning.groups) {
        for (const g of c.readingMeaning.groups) {
          if (g.readings) {
            for (const r of g.readings) {
              if (r.type === 'ja_on') onReadings.push(r.value);
              if (r.type === 'ja_kun') kunReadings.push(r.value);
            }
          }
          if (g.meanings) {
            for (const m of g.meanings) {
              if (m.lang === 'es') meaningsEs.push(m.value);
              if (m.lang === 'en') meaningsEn.push(m.value);
            }
          }
        }
      }

      insertKanji.run(
        literal,
        strokes,
        grade,
        freq,
        jlpt,
        radical,
        JSON.stringify(onReadings),
        JSON.stringify(kunReadings),
        JSON.stringify(meaningsEs),
        JSON.stringify(meaningsEn.slice(0, 5)),
        JSON.stringify(nanori)
      );
      insertedKanji++;
    }
    db.exec('COMMIT');
    console.log(`==> Kanjis insertados: ${insertedKanji}`);
  }

  // 4. INSERTAR ORACIONES (Tatoeba JP-ES)
  const tatoebaJsonPath = path.join(__dirname, '..', 'data', 'tatoeba_jpn_spa.json');
  if (fs.existsSync(tatoebaJsonPath)) {
    console.log('==> Cargando oraciones de Tatoeba (39.748 oraciones)...');
    const sentences = JSON.parse(fs.readFileSync(tatoebaJsonPath, 'utf8'));

    const insertSentence = db.prepare(`
      INSERT INTO sentences (jpn_id, spa_id, japanese, spanish) VALUES (?, ?, ?, ?)
    `);
    const insertSentFts = db.prepare(`
      INSERT INTO sentences_fts (id, japanese, spanish) VALUES (?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION');
    let insertedSent = 0;
    for (const s of sentences) {
      const res = insertSentence.run(s.jid, s.sid, s.jpn, s.spa);
      insertSentFts.run(Number(res.lastInsertRowid), s.jpn, s.spa);
      insertedSent++;
    }
    db.exec('COMMIT');
    console.log(`==> Oraciones insertadas: ${insertedSent}`);
  }

  console.log('==> ¡Base de datos completa creada con éxito en data/dictionary.db!');
}

buildDatabase().catch(err => {
  console.error('Error fatal compilando la base de datos:', err);
  process.exit(1);
});
