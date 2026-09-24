/* =========================================================
   Imágenes: resuelve cada clave a archivos locales optimizados
   (assets/img, generados por scripts/fetch-images.mjs).
   Orden: local (AVIF/WebP + placeholder) → degradado atmosférico. Sin URLs externas.
   ========================================================= */
(function () {
  function resolve(key, { maxWidth = Infinity } = {}) {
    const def = DSV.images[key];
    if (!def) return null;
    const man = (window.DSV_IMAGE_MANIFEST && window.DSV_IMAGE_MANIFEST.images) || {};
    const m = man[key];
    if (m && m.widths && m.widths.length) {
      let ws = m.widths.filter(w => w <= maxWidth);
      if (!ws.length) ws = [m.widths[0]];
      const base = `assets/img/${key}`;
      const set = ext => ws.map(w => `${base}-${w}.${ext} ${w}w`).join(', ');
      const mid = ws[Math.min(ws.length - 1, 1)];
      return { local: true, avif: m.avif ? set('avif') : '', webp: set('webp'), src: `${base}-${mid}.webp`, lqip: m.lqip || '', alt: def.alt };
    }
    return null;
  }

  /* Monta una imagen dentro de un <picture> (con <source type=avif> + <img>). */
  function mount(picture, key, { sizes = '100vw', maxWidth, lazy = false, decorative = true, onReady } = {}) {
    const img = picture.querySelector('img');
    let source = picture.querySelector('source');
    const r = key ? resolve(key, { maxWidth }) : null;
    img.classList.remove('loaded');
    img.onload = null; img.onerror = null;
    if (!r) {
      if (source) source.removeAttribute('srcset');
      img.removeAttribute('srcset'); img.removeAttribute('src');
      return null;
    }
    if (r.avif) {
      if (!source) { source = document.createElement('source'); source.type = 'image/avif'; picture.insertBefore(source, img); }
      source.sizes = sizes; source.srcset = r.avif;
    } else if (source) source.removeAttribute('srcset');
    img.alt = decorative ? '' : r.alt;
    img.loading = lazy ? 'lazy' : 'eager';
    img.decoding = 'async';
    img.onload = () => { img.classList.add('loaded'); onReady && onReady(true); };
    img.onerror = () => { img.removeAttribute('srcset'); img.removeAttribute('src'); onReady && onReady(false); };
    img.sizes = sizes;
    img.srcset = r.webp;
    img.src = r.src;
    if (img.complete && img.naturalWidth) img.classList.add('loaded');
    return r;
  }

  DSV.imgResolve = resolve;
  DSV.imgMount = mount;
})();
