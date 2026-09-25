# Dormir Sin Darle Vueltas a Todo — v1.1.1

Microaplicación web estática (HTML + CSS + JavaScript, sin framework ni paso de compilación).
Funciona abriendo `index.html` o desde cualquier hosting estático (Netlify, Vercel, Cloudflare Pages, GitHub Pages…).

## Estructura

```
index.html               Todas las pantallas
manifest.webmanifest     Instalación como app en el móvil
css/fonts.css            Fuentes autoalojadas (Newsreader, Manrope — licencia OFL)
css/app.css              Estilos
js/config.js             Configuración + catálogo de imágenes (única fuente de verdad)
js/storage.js            Capa de datos (localStorage hoy, Supabase mañana)
js/data.js               Contenido: escenas, lecturas, patrones de respiración, textos
js/images.js             Resolución de imágenes locales (AVIF/WebP + placeholder)
js/fx.js                 Lluvia en cristal, brillo de fuego, relámpago lejano
js/sound.js              Paisajes sonoros generados con Web Audio (sin archivos de audio)
js/app.js                Navegación, pantallas y estado
assets/fonts/            .woff2
assets/img/              Imágenes optimizadas + manifest.js (generados)
assets/img/source/       Originales (13 fotografías del proyecto)
scripts/fetch-images.mjs Optimiza las imágenes (AVIF/WebP responsive + placeholders)
docs/SUPABASE.md         Cómo migrar la persistencia a Supabase
```

## Imágenes

Las 13 imágenes son propias del proyecto y están en `assets/img/source/`. Las versiones optimizadas
(AVIF + WebP en 640 / 1024 / 1600 px y ancho nativo, más placeholder difuminado) ya están generadas en `assets/img/`
y catalogadas en `assets/img/manifest.js`. La app no carga ninguna imagen externa.

Para cambiar una imagen: reemplaza `assets/img/source/<clave>.jpg` y ejecuta

```bash
npm install        # una sola vez (instala sharp)
npm run images -- --only=<clave>
```

El encuadre de cada foto se ajusta en `js/data.js` con `pos` (pantallas horizontales) y `posM` (móvil y tablet vertical).

## Datos del usuario

Todo se guarda en el dispositivo (localStorage, claves `dsv:*`): nombre, estado emocional y ruido mental de cada noche,
pensamientos de la descarga (y su borrador), ritual generado, pasos y ejercicios completados, cómo se fue a la cama,
registro del sueño, escena/volumen/temporizador/tamaño de letra y el punto exacto donde se quedó.

Desde **Mi progreso** la persona puede descargar sus datos (JSON) o borrarlos.

## Probar en local

```bash
npm run serve      # http://localhost:4173
```
