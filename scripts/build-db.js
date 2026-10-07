const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

// Kana to Romaji mapping
const KANA_MAP = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
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
    // Sokuon っ / ッ
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
  if (!posList || posList.length === 0) return { category: 'word', category_es: 'Palabra' };
  const pos = posList.join(' ');
  if (pos.includes('adj-i')) return { category: 'adjective', category_es: 'Adjetivo (I)' };
  if (pos.includes('adj-na')) return { category: 'adjective', category_es: 'Adjetivo (Na)' };
  if (pos.includes('adj-')) return { category: 'adjective', category_es: 'Adjetivo' };
  if (pos.includes('v1')) return { category: 'word', category_es: 'Verbo (Ichidan)' };
  if (pos.includes('v5')) return { category: 'word', category_es: 'Verbo (Godan)' };
  if (pos.includes('vk')) return { category: 'word', category_es: 'Verbo (Kuru)' };
  if (pos.includes('vs')) return { category: 'word', category_es: 'Verbo (Suru)' };
  if (pos.includes('v')) return { category: 'word', category_es: 'Verbo' };
  if (pos.includes('n')) return { category: 'noun', category_es: 'Sustantivo' };
  if (pos.includes('adv')) return { category: 'word', category_es: 'Adverbio' };
  if (pos.includes('exp')) return { category: 'word', category_es: 'Expresión' };
  return { category: 'word', category_es: 'Palabra' };
}

async function buildDatabase() {
  console.log('==> Cargando jmdict-spa-3.6.2.json...');
  const jsonPath = path.join(__dirname, '..', 'data', 'jmdict-spa-3.6.2.json');
  const dbPath = path.join(__dirname, '..', 'data', 'dictionary.db');

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  const words = data.words || [];
  console.log(`==> Total de palabras leídas de JMdict: ${words.length}`);

  const db = new DatabaseSync(dbPath);

  // Schema creation
  db.exec(`
    CREATE TABLE words (
      id TEXT PRIMARY KEY,
      kanji TEXT,
      hiragana TEXT,
      romaji TEXT,
      spanish TEXT,
      category TEXT,
      category_es TEXT,
      common INTEGER,
      definitions_json TEXT,
      example_json TEXT,
      notes TEXT
    );

    CREATE INDEX idx_kanji ON words(kanji);
    CREATE INDEX idx_hiragana ON words(hiragana);
    CREATE INDEX idx_romaji ON words(romaji);
    CREATE INDEX idx_category ON words(category);
    CREATE INDEX idx_common ON words(common);

    CREATE VIRTUAL TABLE words_fts USING fts5(
      id UNINDEXED,
      kanji,
      hiragana,
      romaji,
      spanish
    );
  `);

  const insertWord = db.prepare(`
    INSERT INTO words (
      id, kanji, hiragana, romaji, spanish, category, category_es, common, definitions_json, example_json, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFts = db.prepare(`
    INSERT INTO words_fts (id, kanji, hiragana, romaji, spanish) VALUES (?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION');

  let inserted = 0;

  for (const entry of words) {
    const id = entry.id;

    // Kanji representation: use primary kanji if available, otherwise primary kana
    const primaryKanjiObj = entry.kanji && entry.kanji[0];
    const primaryKanaObj = entry.kana && entry.kana[0];

    const kanjiText = primaryKanjiObj ? primaryKanjiObj.text : (primaryKanaObj ? primaryKanaObj.text : '');
    const kanaText = primaryKanaObj ? primaryKanaObj.text : '';
    const romajiText = kanaToRomaji(kanaText);

    const isCommon = (primaryKanjiObj && primaryKanjiObj.common) || (primaryKanaObj && primaryKanaObj.common) ? 1 : 0;

    // Extract senses and spanish glosses
    const allGlosses = [];
    let posList = [];

    if (entry.sense) {
      for (const s of entry.sense) {
        if (s.partOfSpeech) posList.push(...s.partOfSpeech);
        if (s.gloss) {
          for (const g of s.gloss) {
            if (g.text && g.text.trim()) {
              allGlosses.push(g.text.trim());
            }
          }
        }
      }
    }

    if (allGlosses.length === 0) continue;

    // Deduplicate glosses
    const uniqueGlosses = [...new Set(allGlosses)];
    const primarySpanish = uniqueGlosses[0];
    const { category, category_es } = mapPosToCategory(posList);

    const definitionsJson = JSON.stringify(uniqueGlosses.slice(0, 5));

    insertWord.run(
      id,
      kanjiText,
      kanaText,
      romajiText,
      primarySpanish,
      category,
      category_es,
      isCommon,
      definitionsJson,
      null,
      'Entrada oficial de JMdict (EDRDG)'
    );

    insertFts.run(
      id,
      kanjiText,
      kanaText,
      romajiText,
      uniqueGlosses.join(' ')
    );

    inserted++;
  }

  db.exec('COMMIT');
  console.log(`==> Base de datos creada con éxito en data/dictionary.db`);
  console.log(`==> ${inserted} entradas indexadas en SQLite.`);
}

buildDatabase().catch(console.error);
