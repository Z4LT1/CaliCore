/**
 * Cifras del catálogo, contadas desde el árbol real (no son números escritos a mano):
 * si se agregan ejercicios al catálogo, las cifras se actualizan solas.
 */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Calcula las cifras a partir del árbol de la API. El tronco no cuenta como rama ni como camino. */
export function treeStats(tree) {
  const branches = tree.filter((branch) => !branch.is_trunk);
  const paths = branches.flatMap((branch) => branch.paths);
  return {
    exercises: tree.flatMap((branch) => branch.paths).reduce((total, path) => total + path.exercises.length, 0),
    paths: paths.length,
    branches: branches.length,
    summits: paths.filter((path) => path.exercises.length).length, // cada camino termina en una cima
  };
}

/** Anima un número desde 0 hasta su valor (o lo muestra directo si se pidió reducir el movimiento). */
function countUp(node, value) {
  if (reduceMotion) {
    node.textContent = value;
    return;
  }
  const start = performance.now();
  const duration = 1200;
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - t) ** 3; // desacelera al final
    node.textContent = Math.round(value * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function renderStats(tree) {
  const stats = treeStats(tree);
  document.querySelectorAll("[data-stat]").forEach((node) => countUp(node, stats[node.dataset.stat]));
}
