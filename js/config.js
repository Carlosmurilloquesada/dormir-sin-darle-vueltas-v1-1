/* =========================================================
   Configuración general
   ========================================================= */
window.DSV = window.DSV || {};

DSV.config = {
  // Proveedor de datos. Hoy: 'local' (localStorage). Mañana: 'supabase' (ver docs/SUPABASE.md).
  storage: 'local',

  // Todas las imágenes se sirven desde assets/img (ver assets/img/manifest.js).
  // No hay imágenes externas: si alguna faltara, se muestra el degradado atmosférico.
  allowRemoteImages: false,

  // Durante cuántas horas se ofrece "Continuar mi ritual" tras cerrar la app a medias.
  resumeWindowHours: 6,

  // Hora a partir de la cual una "noche" pertenece al día siguiente (00:00–05:59 cuenta como la noche anterior).
  nightRolloverHour: 6
};

/* ---------------------------------------------------------
   Catálogo de imágenes (propias del proyecto)
   Originales en assets/img/source/<clave>.jpg. El script scripts/fetch-images.mjs
   genera AVIF + WebP en varios anchos + placeholder difuminado y escribe assets/img/manifest.js.
   Para cambiar una imagen: reemplaza su archivo en source/ y ejecuta `npm run images`.
   --------------------------------------------------------- */
DSV.images = {
  // Pantallas del ritual
  room:     { alt: 'Dormitorio cálido de noche con ventanal al lago y luna llena' },
  descarga: { alt: 'Cama con un cuaderno abierto junto a una lámpara y una ventana a la luna' },
  lectura:  { alt: 'Mesa de noche con lámpara encendida, libro abierto y una taza' },
  cierre:   { alt: 'Cama preparada para dormir con luz tenue de lámpara y la luna sobre el lago' },
  // Ambientes sonoros
  lluvia:   { alt: 'Ventana con lluvia de noche frente a la ciudad, con una vela y una taza' },
  chimenea: { alt: 'Chimenea de piedra encendida en una sala con velas' },
  bosque:   { alt: 'Bosque nocturno con luna llena sobre un lago' },
  oceano:   { alt: 'Costa de noche con la luna reflejada en el mar' },
  brisa:    { alt: 'Cortina movida por la brisa junto a una ventana abierta de noche' },
  ruido:    { alt: 'Dormitorio en penumbra con ventilador de techo y lámpara' },
  tormenta: { alt: 'Tormenta lejana sobre un lago, vista desde una cabaña iluminada' },
  cafe:     { alt: 'Mesa de cafetería con capuchino y vela junto a un ventanal con lluvia' },
  tren:     { alt: 'Asiento de tren nocturno junto a una gran ventana con lago y montañas' }
};
