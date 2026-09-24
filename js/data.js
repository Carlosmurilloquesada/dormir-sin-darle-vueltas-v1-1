/* =========================================================
   Contenido y definición de la experiencia
   ========================================================= */
(function(){
DSV.ICON = {
  chimenea:'<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.2 2.3-4.8 3.4-7.6.5 1.6 1.4 2.6 2.4 3 .1-3.2 1.4-5.6 3.6-7.3-.3 2.5.3 4.6 1.6 6.4 1 1.4 1 2.6 1 3.6 0 4.6-2.6 7.5-6 7.5Z"/><path d="M12 21c-1.5 0-2.6-1-2.6-2.5 0-1.4 1.1-2.1 1.6-3.3.9 1.2 2.3 1.4 2.9 2.6.6 1.4-.2 3.2-1.9 3.2Z"/>',
  lluvia:'<path d="M7 15.5a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 7.8a3.9 3.9 0 0 1-.6 7.7"/><path d="M8.5 18.5l-.8 2M12.5 17.5l-.8 2.5M16.5 18.5l-.8 2"/>',
  bosque:'<path d="M8 21V15M8 15 3.5 15 8 4l4.5 11Z"/><path d="M16.5 21v-4.5M16.5 16.5h4L16.5 8l-4 8.5Z"/>',
  oceano:'<path d="M3 9.5c2 0 2.5-1.5 4.5-1.5S10 9.5 12 9.5s2.5-1.5 4.5-1.5S19 9.5 21 9.5"/><path d="M3 14c2 0 2.5-1.5 4.5-1.5S10 14 12 14s2.5-1.5 4.5-1.5S19 14 21 14"/><path d="M3 18.5c2 0 2.5-1.5 4.5-1.5s2.5 1.5 4.5 1.5 2.5-1.5 4.5-1.5 2.5 1.5 4.5 1.5"/>',
  brisa:'<path d="M4 4h16"/><path d="M6 4c0 5 1.5 9 0 16M10 4c0 6 2 10 .5 16"/><path d="M14.5 4c.5 4 3 8 5.5 10"/><path d="M14 9.5c1 2 2.2 3.2 4 4"/>',
  ruido:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.4"/><path d="M12 10.6c-.4-2.4.4-4.4 2.4-5.2M13.3 12.6c2.2 1 3.6 2.6 3.4 4.8M10.7 12.8c-1.8 1.6-3.8 2-5.6.8"/>',
  tormenta:'<path d="M7 14.5a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 6.8a3.9 3.9 0 0 1-.6 7.7"/><path d="M12.5 12 10 16.5h3.5L11 21"/>',
  cafe:'<path d="M4.5 9.5h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 11h1.2a2.3 2.3 0 0 1 0 4.6h-1.5"/><path d="M8.5 3.5c-.6.8.6 1.6 0 2.5M12.5 3.5c-.6.8.6 1.6 0 2.5"/>',
  tren:'<rect x="5.5" y="3.5" width="13" height="14" rx="3"/><path d="M5.5 11h13M9 14.5h.01M15 14.5h.01"/><path d="M8.5 21l1.5-3.5M15.5 21 14 17.5"/>'
};

DSV.svg = (paths, sw=1.4) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

// Cada escena usa la imagen con su misma clave en DSV.images.
DSV.SCENES = {
  chimenea:{name:'Chimenea', desc:'Brasas lentas y leña que cede, en una sala a media luz.', pos:'60% 50%', posM:'67% 50%', motion:'drift', fx:['fire'], filter:'saturate(.95) brightness(.96)', veil:.28,
    fb:'radial-gradient(50% 38% at 50% 76%, rgba(236,128,52,.55), rgba(120,50,20,.25) 55%, transparent 75%), linear-gradient(180deg,#0b0806,#1c110a 70%,#0d0806)'},
  lluvia:{name:'Lluvia suave', desc:'Gotas sobre el cristal y la ciudad, lejos, fuera de foco.', pos:'50% 50%', posM:'30% 50%', motion:'drift', fx:['rain'], filter:'saturate(.95) brightness(.96)', veil:.26,
    fb:'radial-gradient(18% 12% at 30% 40%, rgba(230,170,90,.35), transparent), radial-gradient(14% 10% at 72% 58%, rgba(120,160,220,.3), transparent), linear-gradient(180deg,#0a0d12,#121821)'},
  bosque:{name:'Bosque nocturno', desc:'Luz de luna entre los árboles. Grillos a lo lejos.', pos:'60% 45%', posM:'70% 50%', motion:'drift', fx:[], filter:'saturate(.95)', veil:.26,
    fb:'radial-gradient(30% 25% at 60% 18%, rgba(170,190,215,.22), transparent 70%), linear-gradient(180deg,#0b1014,#070a0b)'},
  oceano:{name:'Océano', desc:'La marea va y viene. La luna se queda.', pos:'58% 50%', posM:'67% 50%', motion:'tide', fx:[], filter:'saturate(.95)', veil:.24,
    fb:'radial-gradient(8% 6% at 55% 28%, rgba(235,235,225,.6), transparent), linear-gradient(180deg,#070a10 0%,#0c1320 52%,#0a0f18 53%,#05070b 100%)'},
  brisa:{name:'Brisa nocturna', desc:'Una ventana abierta y la cortina que apenas se mueve.', pos:'55% 50%', posM:'58% 50%', motion:'sway', fx:[], filter:'saturate(.95) brightness(.96)', veil:.3,
    fb:'linear-gradient(90deg, transparent 30%, rgba(190,200,215,.12) 45%, transparent 60%), linear-gradient(180deg,#0b0c10,#08090c)'},
  ruido:{name:'Ruido blanco', desc:'El murmullo parejo de un ventilador en una casa dormida.', pos:'50% 50%', posM:'42% 50%', motion:'still', fx:[], filter:'saturate(.95)', veil:.3,
    fb:'radial-gradient(60% 40% at 40% 60%, rgba(200,200,205,.08), transparent), linear-gradient(180deg,#0c0c0e,#09090a)'},
  tormenta:{name:'Tormenta lejana', desc:'Lluvia cerca. Truenos que se quedan en el horizonte.', pos:'60% 45%', posM:'79% 50%', motion:'drift', fx:['rain','lightning'], filter:'saturate(.95)', veil:.3,
    fb:'radial-gradient(60% 30% at 60% 25%, rgba(120,135,160,.2), transparent), linear-gradient(180deg,#0b0d12,#07080b)'},
  cafe:{name:'Café bajo la lluvia', desc:'Adentro, tazas y voces bajas. Afuera, la calle mojada.', pos:'55% 50%', posM:'55% 50%', motion:'drift', fx:['rain'], filter:'saturate(.95) brightness(.96)', veil:.26,
    fb:'radial-gradient(40% 30% at 30% 60%, rgba(230,160,90,.3), transparent), linear-gradient(180deg,#120d09,#0a0806)'},
  tren:{name:'Tren nocturno', desc:'El traqueteo constante y un paisaje oscuro que pasa.', pos:'50% 50%', posM:'36% 50%', motion:'rock', fx:[], filter:'saturate(.95) brightness(.96)', veil:.28,
    fb:'radial-gradient(30% 20% at 50% 40%, rgba(230,170,100,.2), transparent), linear-gradient(180deg,#0d0a08,#070606)'}
};
DSV.SCENE_ORDER = ['lluvia','chimenea','bosque','oceano','brisa','ruido','tormenta','cafe','tren'];

// Atmósfera por pantalla — progresión DÍA → DESCONEXIÓN → CALMA → OSCURIDAD → DESCANSO
const ROOM = { key:'room', pos:'55% 50%', posM:'66% 50%', filter:'saturate(.95) brightness(.97)', fb:'radial-gradient(35% 30% at 70% 45%, rgba(233,170,100,.35), transparent 70%), linear-gradient(180deg,#120e0b,#0a0807)' };
DSV.ATMOS = {
  home:     { img:ROOM, veil:.34, shade:1, lamp:0, blur:0 },
  registro: { img:ROOM, veil:.55, shade:1, lamp:0, blur:8 },
  progreso: { img:ROOM, veil:.8, shade:1, lamp:.25, blur:18 },
  checkin:  { img:ROOM, veil:.62, shade:1, lamp:0, blur:6 },
  descarga: { img:{ key:'descarga', pos:'45% 50%', posM:'30% 50%', filter:'saturate(.85) brightness(.9)', fb:'linear-gradient(180deg,#0c0b0b,#070707)'}, veil:.8, shade:1, lamp:.35, blur:10 },
  ritual:   { img:{ key:'descarga', pos:'45% 50%', posM:'30% 50%', filter:'saturate(.8) brightness(.85)', fb:'linear-gradient(180deg,#0c0b0b,#070707)'}, veil:.86, shade:1, lamp:.2, blur:14 },
  respira:  { img:null, veil:1, shade:0, lamp:0, blur:0, ambient:.6 },
  lectura:  { img:{ key:'lectura', pos:'60% 50%', posM:'62% 50%', filter:'saturate(.9) brightness(.92)', fb:'radial-gradient(45% 35% at 20% 10%, rgba(233,170,100,.3), transparent), linear-gradient(180deg,#110d0a,#080706)'}, veil:.86, shade:.6, lamp:1, blur:14 },
  sonidos:  { scene:true, shade:1, lamp:0, blur:0 },
  cierre:   { img:{ key:'cierre', pos:'45% 55%', posM:'34% 50%', filter:'saturate(.9) brightness(.9)', fb:'radial-gradient(30% 25% at 30% 50%, rgba(233,170,100,.22), transparent), linear-gradient(180deg,#0b0908,#060505)'}, veil:.6, shade:1, lamp:0, blur:0 },
  descanso: { scene:true, rest:true, shade:0, lamp:0, blur:0, ambient:.35 }
};
DSV.RITUAL = ['checkin','descarga','ritual','respira','lectura','sonidos','cierre'];

DSV.FEEL = {
  acelerada:{txt:'Con la mente acelerada', resp:'Entonces vamos despacio. Primero, sacar de tu cabeza lo que sigue dando vueltas.', read:1, scene:'lluvia'},
  preocupada:{txt:'Con preocupaciones', resp:'Las preocupaciones pesan menos cuando tienen un lugar. Vamos a dárselo.', read:1, scene:'lluvia'},
  cansada:{txt:'Cansancio sin poder parar', resp:'El cuerpo ya quiere parar. Vamos a ayudar a la mente a alcanzarlo.', read:0, scene:'chimenea'},
  triste:{txt:'Con algo de tristeza', resp:'No hace falta resolverlo esta noche. Solo acompañarlo con suavidad.', read:2, scene:'chimenea'},
  tranquila:{txt:'En calma', resp:'Qué bien. Vamos a cuidar esa calma hasta que llegue el sueño.', read:0, scene:'oceano'},
  nose:{txt:'Sin saber bien cómo', resp:'No hace falta saberlo. Basta con haber llegado.', read:2, scene:'brisa'}
};
DSV.NOISE_LBL = ['','Muy poco','Poco','Algo','Bastante','Mucho'];

// Patrones de respiración (segundos) — se eligen según cómo llega la persona.
DSV.BREATH = {
  larga:  { name:'Exhalación larga', in:4, hold:2, out:7, cycles:8 },
  lenta:  { name:'Respiración lenta', in:4, hold:2, out:6, cycles:6 },
  breve:  { name:'Respiración breve', in:4, hold:1, out:6, cycles:4 }
};

DSV.AFTER = [
  { k:'calma',    txt:'Más en calma' },
  { k:'igual',    txt:'Parecido' },
  { k:'inquieta', txt:'Aún con inquietud' }
];
DSV.SLEEP = [
  { q:5, txt:'Profundamente' },
  { q:4, txt:'Bien' },
  { q:3, txt:'A ratos' },
  { q:2, txt:'Poco' },
  { q:1, txt:'Casi nada' }
];
DSV.WAKES = [ { k:0, txt:'No' }, { k:1, txt:'Una vez' }, { k:2, txt:'Varias veces' } ];

DSV.READINGS = [
  {t:'Nada más que hacer hoy', p:[
    'Hubo un momento, hace unas horas, en que todavía quedaban cosas pendientes. Ese momento ya pasó.',
    'Lo que queda del día no te pide nada. Las respuestas que no encontraste siguen existiendo en algún lugar, y mañana van a estar exactamente donde las dejaste. No se pierden porque dejes de sostenerlas.',
    'Nota el peso de tu cuerpo sobre la cama. No tienes que acomodarlo. Solo notar que la cama lo recibe completo: los hombros, la espalda, las piernas. Nada de eso necesita esfuerzo ahora.',
    'Afuera, la noche hace su trabajo sin prisa. Las calles se vacían, las ventanas se apagan una a una, y en alguna otra casa alguien también está bajando el ritmo.',
    'Si aparece un pensamiento, puedes dejarlo pasar como pasa un coche a lo lejos: lo escuchas acercarse, lo escuchas alejarse. No tienes que seguirlo.',
    'Hoy ya fue suficiente. Tú también.']},
  {t:'La mente que sigue encendida', p:[
    'Tu mente está haciendo lo que sabe hacer: buscar, anticipar, proteger. No está fallando. Solo no se ha enterado todavía de que el día terminó.',
    'No hace falta discutir con ella. Basta con darle menos material. Menos pantalla, menos preguntas, menos «¿y si…?».',
    'Imagina que cada preocupación es una ventana encendida en un edificio de noche. No tienes que apagarlas todas. Solo dejar de mirarlas una por una.',
    'Algunas se apagarán solas. Otras seguirán encendidas hasta la mañana, y está bien. Mañana habrá luz de día, café y una versión tuya más descansada para mirarlas.',
    'Por ahora la tarea es pequeña: soltar la mandíbula, bajar los hombros, dejar que cada exhalación dure un poco más que la anterior.',
    'Eso es todo. No tienes que dormirte ya. Solo descansar mientras el sueño llega.']},
  {t:'Cuando la noche no tiene nombre', p:[
    'No todas las noches tienen nombre. A veces se llega a la cama con algo que no es del todo tristeza ni del todo cansancio; solo un peso sin etiqueta.',
    'No necesitas entenderlo esta noche. Hay cosas que se aclaran mejor después de dormir, del mismo modo que el agua turbia se asienta cuando deja de moverse.',
    'Deja que la habitación esté oscura. Deja que el sonido de fondo ocupe el espacio que antes ocupaban las palabras.',
    'Si algo duele, puede quedarse a tu lado sin que tengas que resolverlo. No es una tarea. No es un examen.',
    'Respira como respira alguien que ya está dormido: lento, sin intención.',
    'La noche es larga, y es amable con quien no le exige nada.']}
];

})();
