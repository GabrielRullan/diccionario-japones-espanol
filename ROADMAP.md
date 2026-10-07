# 🗺️ Full de Ruta: Murasaki no Jisho → Jisho.org en Espanyol

Document de seguiment i registre d'evolució del projecte **Murasaki no Jisho** (紫の辞書).

---

## 📊 Estat General del Projecte

| Fase | Títol | Estat | Progrés |
| :--- | :--- | :---: | :---: |
| **Fase 0** | Fonaments, Domini i Desplegament | ✅ Completat | 100% |
| **Fase 1** | Motor Lingüístic, Desinflexió i JLPT | ✅ Completat | 100% |
| **Fase 2** | Diccionari de Kanji (KANJIDIC2 & KanjiVG) | ✅ Completat | 100% |
| **Fase 3** | Frases d'Exemple en Context (Tatoeba JP-ES) | ✅ Completat | 100% |
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

### ✅ Fase 1: Motor Lingüístic, Desinflexió i JLPT (Completat)
- [x] **Algorisme de desinflexió verbal i d'adjectius (`lib/deinflect.js`)**:
  - Reconeixement de formes conjugades (passat `-ta`, negatiu `-nai`, formal `-masu`, `-te`, potencial, volitiu, etc.).
  - Banner explicatiu en cerca: *"Forma conjugada detectada: 食べた és la forma passat informal (た) de 食べる"*.
- [x] **Indexació de nivells JLPT (N5 - N1)**:
  - 7.563 paraules amb el nivell oficial indexat a SQLite (N5: 532, N4: 528, N3: 1.694, N2: 1.523, N1: 3.286).
  - Insígnia visible a les targetes i al modal de paraula.
  - Filtre desplegable per nivell JLPT a la barra de resultats.

---

### ✅ Fase 2: Diccionari de Kanji Dedicat (KANJIDIC2) (Completat)
- [x] **Integració completa de KANJIDIC2 (13.108 caràcters kanji)**:
  - Nombre de traços, grau escolar (*Jōyō*), freqüència d'ús, radical oficial i nivell JLPT.
  - Lectures On'yomi (音読み), Kun'yomi (訓読み) i Nanori (noms propis).
  - Significats en espanyol i anglès.
- [x] **Ruta canònica per a cada Kanji (`/kanji/:caracter`)**:
  - Exemple: `https://jisho.balears.tech/kanji/桜`.
- [x] **Modal d'inspecció de Kanji**:
  - Clicant sobre qualsevol kanji dins d'una paraula s'obre la fitxa tècnica detallada del caràcter.

---

### ✅ Fase 3: Frases i Exemples en Context (Tatoeba JP-ES) (Completat)
- [x] **Integració del Corpus Tatoeba**:
  - 39.748 oracions bilingües reals japonès ↔ espanyol indexades a SQLite amb índex FTS5.
- [x] **Secció d'exemples al modal de paraula**:
  - Mostra oracions reals contextuals on apareix el terme.
  - Botó d'àudio per escoltar la pronunciació nativa de la frase completa.
- [x] **API d'oracions**:
  - Endpoint `/api/sentences?q=...` per consultar frases associades a qualsevol mot.

---

### ⏳ Fase 4: Sintaxi de Cerca Avançada estil Jisho (Pendent)
- [ ] Tags de cerca: `#jlpt-n5`, `#comun`, `#kanji`, `#frases`, `#verb`, `#adj`.
- [ ] Comodins (`*` i `?`): Cerca de prefixos i sufixos (ex: `*tai`, `shin*`).

---

### ⏳ Fase 5: Eines d'Estudi i Reconeixement Visual (Pendent)
- [ ] Dibuix de Kanji a mà alçada (*Handwriting Recognition*).
- [ ] Cerca per taula visual de radicals (*Radical Lookup*).
- [ ] Botó d'exportació de flashcards per a Anki.
