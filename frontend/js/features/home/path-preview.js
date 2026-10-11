/**
 * Vista previa del árbol: eliges un camino y sus ejercicios aparecen como una escalera
 * que crece de abajo (el más accesible) hacia arriba (la cima).
 */
import { el } from "../../core/dom.js";
import { difficultyMeter } from "../../ui/difficulty.js";

function renderLadder(ladder, path) {
  const last = path.exercises.length - 1;
  ladder.replaceChildren(...path.exercises.map((exercise, i) => el("li", {
    className: `rung${i === last ? " is-summit" : ""}`,
    attrs: { style: `--i:${i}` }, // retraso escalonado de la animación, peldaño por peldaño
  },
  el("span", { className: "rung-step", text: i === last ? "Cima" : `Paso ${exercise.step}` }),
  el("a", { className: "rung-name", text: exercise.name, attrs: { href: `arbol.html#${exercise.slug}` } }),
  difficultyMeter(exercise.difficulty))));
  ladder.setAttribute("aria-label", `Camino ${path.name}: ${path.exercises.length} ejercicios`);
}

export function initPathPreview(select, ladder, tree, defaultPath = "transicion") {
  const pathsBySlug = {};
  for (const branch of tree.filter((b) => !b.is_trunk)) {
    // <optgroup> agrupa las opciones del desplegable por rama
    const group = el("optgroup", { attrs: { label: branch.name } });
    for (const path of branch.paths) {
      pathsBySlug[path.slug] = path;
      group.append(el("option", { text: path.name, attrs: { value: path.slug } }));
    }
    select.append(group);
  }
  select.value = defaultPath;
  renderLadder(ladder, pathsBySlug[select.value]);
  select.addEventListener("change", () => renderLadder(ladder, pathsBySlug[select.value]));
}
