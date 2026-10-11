/**
 * Cálculos del perfil a partir de los favoritos y del árbol: funciones puras (sin DOM).
 */

/** Índice útil del árbol: para cada ejercicio, su camino y si es la cima de ese camino. */
export function indexTree(tree) {
  const bySlug = {};
  for (const branch of tree) {
    for (const path of branch.paths) {
      path.exercises.forEach((exercise, i) => {
        bySlug[exercise.slug] = { ...exercise, branch, path, isSummit: i === path.exercises.length - 1 };
      });
    }
  }
  return bySlug;
}

/** Las cuatro cifras del resumen. */
export function profileStats(favorites, treeIndex) {
  const hardest = favorites.reduce((top, exercise) => (!top || exercise.difficulty > top.difficulty ? exercise : top), null);
  return {
    saved: favorites.length,
    branches: new Set(favorites.map((exercise) => exercise.branch).filter((name) => name !== "Tronco")).size,
    summits: favorites.filter((exercise) => treeIndex[exercise.slug]?.isSummit).length,
    hardest,
  };
}

/** Cuánto de cada rama tiene guardado el usuario: [{ name, saved, total }]. */
export function branchCoverage(tree, savedSlugs) {
  return tree.map((branch) => {
    const exercises = branch.paths.flatMap((path) => path.exercises);
    return {
      name: branch.name,
      saved: exercises.filter((exercise) => savedSlugs.has(exercise.slug)).length,
      total: exercises.length,
    };
  });
}

/**
 * Metas: los favoritos más difíciles, cada uno con el camino de ejercicios que lleva hasta él
 * (los pasos anteriores de su camino en el árbol).
 */
export function goals(favorites, treeIndex, limit = 4) {
  return [...favorites]
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, limit)
    .map((exercise) => {
      const node = treeIndex[exercise.slug];
      return { exercise, path: node.path, steps: node.path.exercises.filter((step) => step.step <= node.step) };
    });
}
