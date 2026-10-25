/**
 * Mapa de la escena: las capas de la ilustración y dónde cae cada parte del árbol de CaliCore.
 *
 * Todas las coordenadas están en "unidades de escena": un lienzo de 2000 × 1200 (la misma
 * proporción 5:3 de las imágenes de 3840 × 2304). El fondo y el árbol usan ese mismo sistema,
 * así que un punto (x, y) cae en el mismo lugar del dibujo aunque la imagen sea más grande.
 *
 * Al cambiar la imagen solo se edita este archivo. Para medir coordenadas nuevas,
 * abrir arbol.html?editar y hacer clic sobre el árbol (ver index.js).
 */
import fondo1920 from "../../../assets/tree/fondo-1920.webp";
import fondo3840 from "../../../assets/tree/fondo-3840.webp";
import arbol1920 from "../../../assets/tree/arbol-1920.webp";
import arbol3840 from "../../../assets/tree/arbol-3840.webp";
import niebla from "../../../assets/tree/niebla.webp";

export const SCENE = { width: 2000, height: 1200 };

/**
 * Imágenes: primero se carga la versión liviana (1920 px) y, cuando termina de bajar,
 * se cambia por la de alta resolución (3840 px), que es la que permite acercarse sin perder nitidez.
 */
export const IMAGES = {
  fondo: { low: fondo1920, high: fondo3840 },
  arbol: { low: arbol1920, high: arbol3840 },
  niebla,
};
/** Píxeles reales de la imagen grande por cada unidad de escena (3840 / 2000). */
export const SOURCE_DENSITY = 1.92;

/** Puntos del fondo, en unidades de escena: el centro del sol y la línea donde se apoyan las raíces. */
export const SUN = { x: 1000, y: 380, r: 150 };
/** Dónde está el dibujo del árbol dentro de su imagen (lo demás es transparente). */
export const TREE_BOX = { x0: 88, x1: 1867 };
export const GROUND_Y = 1185;

/** Colores de rama: tintas apagadas que conversan con el grabado sepia (no colores de pantalla). */
export const BRANCH_COLORS = {
  tronco: "#7a5a3a",
  empuje: "#a5563b",
  traccion: "#4a6a80",
  pierna: "#6e5470",
  core: "#5c7a46",
  habilidades: "#8a3f55",
};

/**
 * Zonas del nivel "árbol completo": solo se ven estas seis etiquetas, para no saturar la lámina.
 * label = dónde va el nombre; anchor = el punto de la rama al que apunta su línea guía.
 */
export const ZONES = {
  tronco: { label: [1000, 905], anchor: [995, 790] },
  pierna: { label: [330, 820], anchor: [540, 612] },
  core: { label: [1660, 820], anchor: [1460, 600] },
  empuje: { label: [330, 300], anchor: [620, 452] },
  traccion: { label: [1660, 300], anchor: [1390, 440] },
  habilidades: { label: [1000, 52], anchor: [1000, 215] },
};

/** Raíces: no son ejercicios; enlazan a la historia. */
export const ROOTS = { x: 1000, y: 1120, label: "Raíces · la historia", href: "historia.html" };

/**
 * Puntos de paso de cada camino (slug del camino -> puntos), siguiendo las ramas dibujadas
 * desde el tronco hacia afuera. Se suavizan como curvas (Catmull-Rom) en tree.view.js, así que
 * basta con marcar por dónde pasa la rama; no hace falta que los tramos sean rectos.
 */
export const PATH_LINES = {
  // Tronco: de la base a la cruz donde se abren las ramas
  fundamentos: [[995, 1010], [990, 900], [986, 790], [990, 680], [1000, 575]],

  // Pierna: la gran rama baja de la izquierda y sus brotes
  "sentadilla-unilateral": [[905, 650], [800, 585], [690, 560], [590, 568], [490, 600], [390, 625], [280, 640], [160, 662]],
  "cadena-posterior": [[880, 645], [790, 650], [715, 672], [645, 705], [575, 728]],
  "sentadilla-camaron": [[760, 578], [645, 612], [545, 652], [445, 692], [350, 728]],

  // Core: la gran rama baja de la derecha y sus brotes
  "elevaciones-colgado": [[1070, 620], [1160, 572], [1260, 560], [1360, 562], [1460, 590], [1560, 612], [1680, 640], [1800, 665]],
  compresion: [[1110, 645], [1200, 655], [1290, 682], [1380, 712], [1460, 742]],
  "anti-extension": [[1430, 585], [1505, 640], [1600, 680], [1700, 708], [1790, 722]],

  // Empuje: la copa media de la izquierda
  flexiones: [[930, 500], [840, 472], [740, 462], [640, 472], [540, 490], [440, 500], [340, 482], [235, 452], [160, 430]],
  fondos: [[920, 462], [840, 425], [740, 405], [640, 395], [540, 385], [440, 368], [345, 345]],
  "empuje-vertical": [[950, 440], [880, 382], [790, 352], [690, 333], [590, 322]],

  // Tracción: la copa media de la derecha
  dominadas: [[1070, 500], [1160, 472], [1260, 462], [1360, 472], [1460, 490], [1560, 500], [1660, 472], [1765, 442]],
  transicion: [[1080, 462], [1160, 425], [1260, 405], [1360, 395], [1460, 385], [1560, 365]],
  "traccion-horizontal": [[1050, 440], [1120, 382], [1210, 352], [1310, 333], [1410, 322]],

  // Habilidades: la cima de la copa
  planche: [[975, 420], [940, 330], [900, 250], [860, 172], [820, 112]],
  pino: [[1000, 420], [996, 320], [992, 222], [987, 132], [978, 45]],
  "front-lever": [[1030, 420], [1068, 330], [1102, 242], [1140, 162], [1180, 102]],
  "back-lever": [[1050, 410], [1140, 342], [1240, 282], [1340, 222], [1430, 172]],
  bandera: [[950, 410], [860, 352], [760, 292], [660, 232], [560, 172]],
};

/** Curva suave que pasa por todos los puntos (Catmull-Rom convertida a curvas Bézier de SVG). */
export function smoothPath(points) {
  if (points.length < 3) return `M ${points.map((p) => p.join(" ")).join(" L ")}`;
  const p = [points[0], ...points, points[points.length - 1]]; // se repiten los extremos
  let d = `M ${p[1][0]} ${p[1][1]}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6];
    const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${x2} ${y2}`;
  }
  return d;
}

/**
 * Arma la lista plana de nodos (uno por ejercicio) a partir del árbol de la API.
 * La posición exacta (x, y) sobre la curva la calcula tree.view.js, que puede medir la curva
 * ya dibujada; aquí solo se decide en qué fracción del camino (t) va cada ejercicio.
 */
export function buildNodes(tree) {
  const nodes = [];
  for (const branch of tree) {
    for (const path of branch.paths) {
      if (!PATH_LINES[path.slug]) continue; // un camino nuevo sin trazo en el mapa todavía no se dibuja
      const count = path.exercises.length;
      path.exercises.forEach((exercise, i) => {
        // El primero se separa un poco del tronco (t = 0.14) y la cima queda en la punta (t = 1)
        const t = count === 1 ? 1 : 0.14 + (0.86 * i) / (count - 1);
        nodes.push({ ...exercise, t, x: 0, y: 0, branch, path, isSummit: i === count - 1 });
      });
    }
  }
  return nodes;
}
