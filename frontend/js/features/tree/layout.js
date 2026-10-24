/**
 * Mapa de la ilustración: dónde cae cada parte del árbol de CaliCore sobre la imagen.
 *
 * La escena se arma con capas del mismo tamaño (2000 × 1200): el fondo (cielo, sol, montañas)
 * y el árbol solo, con fondo transparente. Ambas se estiran para llenar toda la página (ver
 * tree.view.js); separadas, más adelante pueden moverse a distinta velocidad (parallax).
 *
 * Las coordenadas están en píxeles de la imagen original (0,0 = esquina superior izquierda).
 * Cada camino es una línea (polilínea) que sigue una rama dibujada; sus ejercicios se reparten
 * solos a lo largo de ella, del primero (cerca del tronco) a la cima (en la punta).
 *
 * Al cambiar la imagen, solo se edita este archivo. Para medir coordenadas nuevas,
 * abrir arbol.html?editar y hacer clic sobre la imagen (ver index.js).
 */
import fondoUrl from "../../../assets/tree/capa-fondo.jpg";
import arbolUrl from "../../../assets/tree/capa-arbol.webp";

export const SCENE = {
  width: 2000,
  height: 1200,
  // De atrás hacia adelante
  layers: [
    { id: "fondo", url: fondoUrl },
    { id: "arbol", url: arbolUrl },
  ],
};

/** Color de cada rama: tonos fuertes que contrastan con el follaje verde de la ilustración. */
export const BRANCH_COLORS = {
  tronco: "#8B5E3C",
  empuje: "#C8553D",
  traccion: "#2F6690",
  pierna: "#6A4C93",
  core: "#2E7D4F",
  habilidades: "#A23B72",
};

/** Raíces: no son ejercicios; enlazan a la historia. */
export const ROOTS = { x: 1000, y: 1110, label: "Raíces · la historia", href: "historia.html" };

/**
 * Polilíneas por camino (slug del camino -> puntos), siguiendo las ramas de la imagen.
 * PROVISORIAS: trazadas a ojo sobre una grilla. Se afinan en el paso siguiente con ?editar.
 */
export const PATH_LINES = {
  // Tronco: de la base hacia la bifurcación
  fundamentos: [[1000, 1000], [1000, 880], [1000, 760], [1000, 640], [1000, 540]],

  // Pierna: copa baja izquierda
  "cadena-posterior": [[890, 620], [770, 575], [640, 560], [520, 590], [400, 620]],
  "sentadilla-unilateral": [[880, 660], [760, 640], [620, 650], [480, 670], [340, 680], [200, 670]],
  "sentadilla-camaron": [[890, 700], [800, 710], [700, 730], [600, 740]],

  // Core: copa baja derecha
  compresion: [[1110, 620], [1240, 575], [1380, 580], [1520, 610]],
  "elevaciones-colgado": [[1110, 660], [1250, 640], [1400, 645], [1550, 660], [1700, 670]],
  "anti-extension": [[1110, 700], [1220, 710], [1330, 720], [1440, 730]],

  // Empuje: copa media izquierda
  flexiones: [[930, 500], [820, 470], [700, 450], [570, 440], [440, 440], [310, 450], [200, 470]],
  fondos: [[930, 470], [820, 450], [700, 420], [580, 400]],
  "empuje-vertical": [[940, 440], [850, 400], [750, 360], [650, 330], [540, 320]],

  // Tracción: copa media derecha
  dominadas: [[1070, 500], [1180, 470], [1300, 450], [1430, 440], [1560, 440], [1690, 450], [1800, 470]],
  transicion: [[1070, 470], [1180, 450], [1300, 420], [1420, 400]],
  "traccion-horizontal": [[1060, 440], [1150, 400], [1250, 360], [1360, 330], [1470, 320]],

  // Habilidades: la cima de la copa
  planche: [[980, 400], [950, 300], [920, 200], [890, 100]],
  pino: [[1000, 400], [1000, 300], [1000, 190], [1000, 60]],
  "front-lever": [[1020, 400], [1050, 300], [1085, 200], [1120, 100]],
  "back-lever": [[1040, 410], [1130, 330], [1230, 250], [1340, 190], [1450, 160]],
  bandera: [[960, 410], [870, 330], [770, 250], [660, 190], [550, 160]],
};

/** Punto a una fracción t (0 a 1) del largo total de una polilínea. */
export function pointAt(points, t) {
  const lengths = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
  let target = t * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]) {
      const k = lengths[i] ? target / lengths[i] : 0;
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * k, points[i][1] + (points[i + 1][1] - points[i][1]) * k];
    }
    target -= lengths[i];
  }
  return points[points.length - 1];
}

/**
 * Ubica cada ejercicio del árbol (de la API) sobre su polilínea, repartidos de forma pareja.
 * Devuelve una lista plana de nodos con ix, iy (posición en píxeles de la imagen), rama, camino
 * y si es la cima. La posición en pantalla (x, y) la calcula fitScene() en tree.view.js.
 */
export function placeNodes(tree) {
  const nodes = [];
  for (const branch of tree) {
    for (const path of branch.paths) {
      const line = PATH_LINES[path.slug];
      if (!line) continue; // un camino nuevo sin línea en el mapa todavía no se dibuja
      const count = path.exercises.length;
      path.exercises.forEach((exercise, i) => {
        // El primero se separa un poco del tronco (t mínimo 0.12) y la cima queda en la punta (t = 1)
        const t = count === 1 ? 1 : 0.12 + (0.88 * i) / (count - 1);
        const [ix, iy] = pointAt(line, t);
        nodes.push({ ...exercise, ix, iy, x: ix, y: iy, branch, path, isSummit: i === count - 1 });
      });
    }
  }
  return nodes;
}
