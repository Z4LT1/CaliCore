/**
 * Mapa de la ilustración: dónde cae cada parte del árbol de CaliCore sobre la imagen.
 *
 * Las coordenadas están en píxeles de la imagen original (0,0 = esquina superior izquierda).
 * Cada camino es una línea (polilínea) que sigue una rama dibujada; sus ejercicios se reparten
 * solos a lo largo de ella, del primero (cerca del tronco) a la cima (en la punta).
 *
 * Al cambiar la imagen, solo se edita este archivo. Para medir coordenadas nuevas,
 * abrir arbol.html?editar y hacer clic sobre la imagen (ver index.js).
 */
import imageUrl from "../../../assets/tree/arbol-prueba.jpg"; // provisoria: no está en Git (ver .gitignore)

export const IMAGE = { url: imageUrl, width: 736, height: 1104 };

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
export const ROOTS = { x: 370, y: 960, label: "Raíces · la historia", href: "historia.html" };

/** Polilíneas por camino (slug del camino -> puntos), siguiendo las ramas de la imagen. */
export const PATH_LINES = {
  // Tronco: de la base hacia la bifurcación
  fundamentos: [[366, 905], [362, 830], [360, 760], [356, 690]],

  // Pierna: rama baja izquierda
  "sentadilla-unilateral": [[330, 660], [260, 650], [190, 640], [120, 630], [55, 620]],
  "sentadilla-camaron": [[310, 672], [240, 692], [170, 702]],
  "cadena-posterior": [[300, 625], [235, 595], [170, 578], [105, 562]],

  // Core: rama baja derecha
  "elevaciones-colgado": [[420, 700], [485, 662], [552, 642], [622, 622]],
  compresion: [[438, 676], [500, 610], [570, 582], [650, 568]],
  "anti-extension": [[432, 724], [502, 718], [572, 700], [642, 688]],

  // Empuje: copa media izquierda
  flexiones: [[340, 560], [280, 545], [220, 530], [160, 520], [100, 510], [45, 500]],
  fondos: [[335, 530], [280, 502], [225, 482], [170, 462]],
  "empuje-vertical": [[338, 500], [300, 466], [262, 442], [222, 426]],

  // Tracción: copa media derecha
  dominadas: [[376, 560], [436, 550], [496, 540], [556, 530], [616, 520], [676, 510]],
  transicion: [[376, 530], [441, 505], [506, 480]],
  "traccion-horizontal": [[372, 500], [430, 470], [490, 446], [550, 426], [610, 410]],

  // Habilidades: la cima de la copa
  planche: [[340, 405], [300, 352], [262, 302], [232, 260], [212, 222], [200, 188]],
  pino: [[355, 400], [360, 330], [366, 260], [372, 190]],
  "front-lever": [[365, 402], [410, 352], [452, 302], [492, 252]],
  "back-lever": [[372, 412], [442, 392], [512, 362], [582, 332]],
  bandera: [[334, 414], [268, 402], [200, 384], [132, 372]],
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
