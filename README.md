# 💜 Murasaki no Jisho (紫の辞書) | Diccionario Japonés — Español

Diccionario interactivo de vocabulario Japonés-Español, con diseño editorial **Murasaki no Jisho** en tonos lila y papel *washi*, generado a través del servidor MCP de **Google Stitch** y preparado para despliegue productivo en **Google Cloud Run** y **Firebase**.

Repositorio GitHub: [GabrielRullan/diccionario-japones-espanol](https://github.com/GabrielRullan/diccionario-japones-espanol)

---

## ✨ Características

- **Diseño Editorial Japonés (Murasaki no Jisho / Stitch)**:
  - Estética minimalista inspirada en papel *washi* cálido (`#FAF7F2`), tinta *sumi* (`#1A1A1E`) y acentos en púrpura tradicional japonés / lila (*murasaki* `#794391`) e índigo profundo (`#1E3A5F`).
  - Cuadrícula de kanji estilo *genkouyoushi* con escalado dinámico según longitud de palabra.
  - Tipografía clara con anotaciones *furigana* y niveles oficiales JLPT (N5 y N4).
- **Base de Datos Léxica Integrada (`data/dictionary.json`)**:
  - **10 Verbos / Palabras esenciales**: 食べる, 行く, 見る, 話す, 飲む, 書く, 読む, 聞く, 買う, 待つ.
  - **10 Sustantivos clave**: 桜, 猫, 水, 本, 車, 友達, 時間, 空, 家, 山.
  - **10 Adjetivos (I y NA)**: 美しい, 新しい, 静か, 高い, 優しい, 楽しい, 大きい, 綺麗, 暖かい, 難しい.
- **Búsqueda Inteligente e Historial de Últimos Resultados**:
  - Búsqueda simultánea en tiempo real por Kanji, Hiragana, Rōmaji o Español.
  - Visualización inmediata de las últimas palabras consultadas cuando la barra de búsqueda está vacía.
  - Filtros rápidos por categoría léxica y nivel JLPT.
- **Pronunciación Nativa**:
  - Reproductor de audio mediante proxy de alta fidelidad en japonés (`/api/tts`) con respaldo en Web Speech API.
- **Listo para Google Cloud y Firebase**:
  - `Dockerfile` multi-etapa optimizado para **Google Cloud Run**.
  - Canalización de integración y despliegue continuo con `cloudbuild.yaml`.
  - Configuración para **Firebase Hosting** con proxy a Cloud Run (`firebase.json`).

---

## 🚀 Ejecución en Local

### Requisitos previos
- [Node.js](https://nodejs.org/) v18+ instalado.

### Pasos
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/GabrielRullan/diccionario-japones-espanol.git
   cd diccionario-japones-espanol
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor local:
   ```bash
   npm start
   ```

4. Abrir en el navegador:
   ```
   http://localhost:8080
   ```

---

## ☁️ Despliegue en Google Cloud Run

### Opción 1: Despliegue directo con gcloud CLI
Asegúrate de haber iniciado sesión con `gcloud auth login` y seleccionado tu proyecto:

```powershell
.\deploy-cloudrun.ps1 -ProjectId TU_PROJECT_ID
```

O directamente mediante el comando oficial de Cloud Run:
```bash
gcloud run deploy diccionario-japones-espanol \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated
```

### Opción 2: Despliegue con Google Cloud Build
Ejecuta la canalización definida en `cloudbuild.yaml`:
```bash
gcloud builds submit --config cloudbuild.yaml .
```

### Opción 3: Despliegue con Contenedor Docker Local
```bash
docker build -t diccionario-japones-espanol .
docker run -p 8080:8080 diccionario-japones-espanol
```

---

## 🔥 Despliegue en Firebase Hosting (Opcional)

Si prefieres servir el frontend a través de la red global CDN de Firebase Hosting:
```bash
firebase deploy --only hosting
```

---

## 📂 Estructura del Proyecto

```
├── data/
│   └── dictionary.json         # Base de datos JSON de 30 entradas
├── public/
│   ├── css/
│   │   └── style.css           # Estilos Kotoba Sol (diseño Stitch)
│   ├── js/
│   │   └── app.js              # Lógica de búsqueda, modal y fichas
│   └── index.html              # Interfaz de usuario interactiva
├── Dockerfile                  # Contenedor productivo para Cloud Run
├── .dockerignore               # Archivos omitidos en la imagen Docker
├── cloudbuild.yaml             # Pipeline CI/CD para Google Cloud Build
├── deploy-cloudrun.ps1         # Script de despliegue directo PowerShell
├── firebase.json               # Configuración de Firebase Hosting
├── package.json                # Dependencias y scripts de Node
├── server.js                   # Servidor Express con endpoints REST
└── README.md                   # Documentación del proyecto
```

---

## 📜 Licencia

MIT © Gabriel Rul-lan
