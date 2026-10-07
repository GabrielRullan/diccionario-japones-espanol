// lib/deinflect.js
// Motor de desinflexión verbal y de adjetivos para japonés
// Convierte formas conjugadas (ej. 食べた, 飲みます, 行かない) a sus formas de diccionario (食べる, 飲む, 行く)

const INFLECTIONS = [
  // Formas comunes en Hiragana / Kanji
  // Ichidan (Grupo 2)
  { suffix: 'ます', replace: 'る', type: 'v1', name: 'formal presente (ます)' },
  { suffix: 'ました', replace: 'る', type: 'v1', name: 'formal pasado (ました)' },
  { suffix: 'ません', replace: 'る', type: 'v1', name: 'formal negativo (ません)' },
  { suffix: 'ませんでした', replace: 'る', type: 'v1', name: 'formal pasado negativo (ませんでした)' },
  { suffix: 'ない', replace: 'る', type: 'v1', name: 'negativo informal (ない)' },
  { suffix: 'なかった', replace: 'る', type: 'v1', name: 'pasado negativo (なかった)' },
  { suffix: 'た', replace: 'る', type: 'v1', name: 'pasado informal (た)' },
  { suffix: 'て', replace: 'る', type: 'v1', name: 'forma -te (て)' },
  { suffix: 'たい', replace: 'る', type: 'v1', name: 'desiderativo (たい)' },
  { suffix: 'たくない', replace: 'る', type: 'v1', name: 'desiderativo negativo (たくない)' },
  { suffix: 'たかった', replace: 'る', type: 'v1', name: 'desiderativo pasado (たかった)' },
  { suffix: 'よう', replace: 'る', type: 'v1', name: 'volitivo (よう)' },
  { suffix: 'られる', replace: 'る', type: 'v1', name: 'potencial / pasivo (られる)' },
  { suffix: 'させる', replace: 'る', type: 'v1', name: 'causativo (させる)' },
  { suffix: 'れば', replace: 'る', type: 'v1', name: 'condicional (れば)' },

  // Godan (Grupo 1) - terminaciones en 'ます', 'ました'
  { suffix: 'います', replace: 'う', type: 'v5u', name: 'formal presente (ます)' },
  { suffix: 'きました', replace: 'く', type: 'v5k', name: 'formal pasado (ました)' },
  { suffix: 'きます', replace: 'く', type: 'v5k', name: 'formal presente (ます)' },
  { suffix: 'ぎます', replace: 'ぐ', type: 'v5g', name: 'formal presente (ます)' },
  { suffix: 'します', replace: 'す', type: 'v5s', name: 'formal presente (ます)' },
  { suffix: 'ちます', replace: 'つ', type: 'v5t', name: 'formal presente (ます)' },
  { suffix: 'にます', replace: 'ぬ', type: 'v5n', name: 'formal presente (ます)' },
  { suffix: 'びます', replace: 'ぶ', type: 'v5b', name: 'formal presente (ます)' },
  { suffix: 'みます', replace: 'む', type: 'v5m', name: 'formal presente (ます)' },
  { suffix: 'ります', replace: 'る', type: 'v5r', name: 'formal presente (ます)' },

  // Godan - negativos (-anai)
  { suffix: 'わない', replace: 'う', type: 'v5u', name: 'negativo informal (ない)' },
  { suffix: 'かない', replace: 'く', type: 'v5k', name: 'negativo informal (ない)' },
  { suffix: 'がない', replace: 'ぐ', type: 'v5g', name: 'negativo informal (ない)' },
  { suffix: 'さない', replace: 'す', type: 'v5s', name: 'negativo informal (ない)' },
  { suffix: 'たない', replace: 'つ', type: 'v5t', name: 'negativo informal (ない)' },
  { suffix: 'なない', replace: 'ぬ', type: 'v5n', name: 'negativo informal (ない)' },
  { suffix: 'ばない', replace: 'ぶ', type: 'v5b', name: 'negativo informal (ない)' },
  { suffix: 'まない', replace: 'む', type: 'v5m', name: 'negativo informal (ない)' },
  { suffix: 'らない', replace: 'る', type: 'v5r', name: 'negativo informal (ない)' },

  // Godan - pasado y forma -te
  { suffix: 'った', replace: 'う', type: 'v5u', name: 'pasado informal (った)' },
  { suffix: 'った', replace: 'つ', type: 'v5t', name: 'pasado informal (った)' },
  { suffix: 'った', replace: 'る', type: 'v5r', name: 'pasado informal (った)' },
  { suffix: 'って', replace: 'う', type: 'v5u', name: 'forma -te (って)' },
  { suffix: 'って', replace: 'つ', type: 'v5t', name: 'forma -te (って)' },
  { suffix: 'って', replace: 'る', type: 'v5r', name: 'forma -te (って)' },

  { suffix: 'いた', replace: 'く', type: 'v5k', name: 'pasado informal (いた)' },
  { suffix: 'いて', replace: 'く', type: 'v5k', name: 'forma -te (いて)' },
  { suffix: 'いだ', replace: 'ぐ', type: 'v5g', name: 'pasado informal (いだ)' },
  { suffix: 'いで', replace: 'ぐ', type: 'v5g', name: 'forma -te (いで)' },

  { suffix: 'した', replace: 'す', type: 'v5s', name: 'pasado informal (した)' },
  { suffix: 'して', replace: 'す', type: 'v5s', name: 'forma -te (して)' },

  { suffix: 'んだ', replace: 'む', type: 'v5m', name: 'pasado informal (んだ)' },
  { suffix: 'んだ', replace: 'ぶ', type: 'v5b', name: 'pasado informal (んだ)' },
  { suffix: 'んだ', replace: 'ぬ', type: 'v5n', name: 'pasado informal (んだ)' },
  { suffix: 'んで', replace: 'む', type: 'v5m', name: 'forma -te (んで)' },
  { suffix: 'んで', replace: 'ぶ', type: 'v5b', name: 'forma -te (んで)' },
  { suffix: 'んで', replace: 'ぬ', type: 'v5n', name: 'forma -te (んで)' },

  // Irregulares: する (Suru)
  { suffix: 'します', replace: 'する', type: 'vs', name: 'formal presente de する' },
  { suffix: 'しました', replace: 'する', type: 'vs', name: 'formal pasado de する' },
  { suffix: 'しない', replace: 'する', type: 'vs', name: 'negativo de する' },
  { suffix: 'しなかった', replace: 'する', type: 'vs', name: 'pasado negativo de する' },
  { suffix: 'した', replace: 'する', type: 'vs', name: 'pasado de する' },
  { suffix: 'して', replace: 'する', type: 'vs', name: 'forma -te de する' },
  { suffix: 'できる', replace: 'する', type: 'vs', name: 'potencial de する' },

  // Irregulares: くる / 来る (Kuru)
  { suffix: '来ます', replace: '来る', type: 'vk', name: 'formal presente de 来る' },
  { suffix: '来ました', replace: '来る', type: 'vk', name: 'formal pasado de 来る' },
  { suffix: '来ない', replace: '来る', type: 'vk', name: 'negativo de 来る' },
  { suffix: '来なかった', replace: '来る', type: 'vk', name: 'pasado negativo de 来る' },
  { suffix: '来た', replace: '来る', type: 'vk', name: 'pasado de 来る' },
  { suffix: '来て', replace: '来る', type: 'vk', name: 'forma -te de 来る' },
  { suffix: 'きます', replace: 'くる', type: 'vk', name: 'formal presente de くる' },
  { suffix: 'きました', replace: 'くる', type: 'vk', name: 'formal pasado de くる' },
  { suffix: 'こない', replace: 'くる', type: 'vk', name: 'negativo de くる' },
  { suffix: 'きた', replace: 'くる', type: 'vk', name: 'pasado de くる' },
  { suffix: 'きて', replace: 'くる', type: 'vk', name: 'forma -te de くる' },

  // Adjetivos tipo -I
  { suffix: 'かった', replace: 'い', type: 'adj-i', name: 'adjetivo pasado (かった)' },
  { suffix: 'くない', replace: 'い', type: 'adj-i', name: 'adjetivo negativo (くない)' },
  { suffix: 'くなかった', replace: 'い', type: 'adj-i', name: 'adjetivo pasado negativo (くなかった)' },
  { suffix: 'くて', replace: 'い', type: 'adj-i', name: 'adjetivo forma -te (くて)' },
  { suffix: 'く', replace: 'い', type: 'adj-i', name: 'adjetivo adverbial (く)' },
];

/**
 * Desinflexiona una palabra dada, devolviendo posibles formas base y su explicación gramatical
 * @param {string} word - La palabra conjugada (ej: 食べた, 飲みます, 寒かった)
 * @returns {Array<{ term: string, description: string, rule: string }>}
 */
function deinflect(word) {
  if (!word || typeof word !== 'string') return [];
  const trimmed = word.trim();
  if (trimmed.length < 2) return [];

  const candidates = [];
  const seen = new Set();

  for (const rule of INFLECTIONS) {
    if (trimmed.endsWith(rule.suffix)) {
      const stem = trimmed.slice(0, trimmed.length - rule.suffix.length);
      if (stem.length > 0) {
        const candidateTerm = stem + rule.replace;
        const key = candidateTerm + ':' + rule.name;
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({
            original: trimmed,
            term: candidateTerm,
            description: rule.name,
            type: rule.type
          });
        }
      }
    }
  }

  return candidates;
}

module.exports = {
  deinflect,
  INFLECTIONS
};
