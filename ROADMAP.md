# 🗺️ Full de Ruta: Murasaki no Jisho → Jisho.org en Espanyol

Document de seguiment i registre d'evolució del projecte **Murasaki no Jisho** (紫の辞書).

---

## 📊 Estat General del Projecte

| Fase | Títol | Estat | Progrés |
| :--- | :--- | :---: | :---: |
| **Fase 0** | Fonaments, Domini i Desplegament | ✅ Completat | 100% |
| **Fase 1** | Motor Lingüístic, Desinflexió i JLPT | 🔄 En curs | 30% |
| **Fase 2** | Diccionari de Kanji (KANJIDIC2 & KanjiVG) | ⏳ Pendent | 0% |
| **Fase 3** | Frases d'Exemple en Context (Tatoeba JP-ES) | ⏳ Pendent | 0% |
| **Fase 4** | Sintaxi de Cerca Avançada (#jlpt, #kanji, #comun) | ⏳ Pendent | 0% |
| **Fase 5** | Eines d'Estudi (Dibuix manual de Kanji, Radicals, Anki) | ⏳ Pendent | 0% |

---

## 🚀 Desglossament per Fases

### ✅ Fase 0: Fonaments, Domini i Desplegament (Completat)
- [x] Base de dades SQLite compilada amb 34.309 entrades de **JMdict-Simplified** (espanyol).
- [x] Motor de cerca per Kanji, Hiragana, Rōmaji i Espanyol.
- [x] Separació de categories: Verbos (6.665), Sustantivos (22.048), Adjetivos (3.449), Expresiones (1.362).
- [x] Servei de síntesi de veu nativa japonesa (`/api/tts`).
- [x] Disseny lila corporatiu basat en Google Stitch MCP.
- [x] Sistema d'URLs canòniques estil Jisho: `/word/:kanji` i `/search/:query` amb `pushState`/`popstate`.
- [x] Etiquetes Open Graph per a xarxes socials i indexació SEO.
- [x] Domini personalitzat `https://jisho.balears.tech` amb SSL gestionat actiu a Google Cloud Run.
- [x] Atribució legal i llicència CC BY-SA 3.0 visible per a EDRDG i JMdict-Simplified.

---

### 🔄 Fase 1: Motor Lingüístic, Desinflexió i JLPT
*Objectiu: Fer que el diccionari sigui intel·ligent amb la gramàtica japonesa i reconegui totes les formes conjugades.*

- [ ] **1.1 Algorisme de desinflexió verbal i d'adjectius (`lib/deinflect.js`)**:
  - Reconeixement de passat (`-ta` / `-da`), negatiu (`-nai`), formal (`-masu`), te-form (`-te`), potencial (`-eru`), volitiu (`-ou`), causatiu (`-saseru`), passiu (`-rareru`), adjectius en `-i` (`-katta`, `-kunai`).
  - Mostrar a la cerca: *"Forma conjugada (passat informal) de [Verbo]"*.
- [ ] **1.2 Indexació de nivells JLPT (N5 - N1)**:
  - Integrar etiquetatge oficial JLPT per a cada paraula.
  - Insígnia visible `N5`, `N4`, `N3`, `N2`, `N1` a cada fitxa.
  - Filtre directe a la interfície per nivell JLPT.
- [ ] **1.3 Furigana interactiu amb `<ruby>`**:
  - Renderitzat de text amb lectures sobre cada kanji (`<ruby>桜<rt>さくら</rt></ruby>`).

---

### ⏳ Fase 2: Diccionari de Kanji Dedicat (KANJIDIC2 & KanjiVG)
*Objectiu: Fitxa completa per a cada kanji individual com a Jisho.org (`/kanji/:caràcter`).*

- [ ] **2.1 Integració KANJIDIC2 d'EDRDG**:
  - Taula `kanji` a SQLite amb els 13.000+ caràcters japonesos.
  - Nombre de traços, grau escolar (*Jōyō*), nivell JLPT, radical principal (*bushu*).
  - Lectures On'yomi (音読み) en katakana i Kun'yomi (訓読み) en hiragana amb okurigana.
  - Significats en espanyol.
- [ ] **2.2 Ordre de Traços Vectorial (KanjiVG)**:
  - Animació i visualització SVG dels traços pas a pas per aprendre a escriure el caràcter.
- [ ] **2.3 Ruta dedicada `/kanji/:caracter`**:
  - URL pròpia i enllaç des de qualsevol kanji que aparegui a les paraules del diccionari.

---

### ⏳ Fase 3: Frases i Exemples en Context (Tatoeba JP-ES)
*Objectiu: Veure com s'utilitza cada paraula en frases reals de conversa quotidiana.*

- [ ] **3.1 Descàrrega i filtrat del Corpus Tatoeba (Japonès ↔ Espanyol)**:
  - Base de dades de frases bilingües lliures.
  - Associació automàtica de frases a les entrades del diccionari.
- [ ] **3.2 Secció "Frases d'Exemple" al modal de paraula**:
  - Mostrar 2-4 oracions reals amb la paraula ressaltada.
  - Reproducció de veu nativa de la frase completa.
- [ ] **3.3 Pàgina de cerca d'oracions**:
  - Ruta `/sentences/:query` per cercar exemples directament.

---

### ⏳ Fase 4: Sintaxi de Cerca Avançada estil Jisho
*Objectiu: Operadors potents per a usuaris avançats i estudiants.*

- [ ] Tags de cerca: `#jlpt-n5`, `#comun`, `#kanji`, `#frases`, `#verb`, `#adj`.
- [ ] Comodins (`*` i `?`): Cerca de prefixos i sufixos (ex: `*tai`, `shin*`).

---

### ⏳ Fase 5: Eines d'Estudi i Reconeixement Visual
- [ ] Dibuix de Kanji a mà alçada (*Handwriting Recognition*).
- [ ] Cerca per taula visual de radicals (*Radical Lookup*).
- [ ] Botó d'exportació de flashcards per a Anki.
