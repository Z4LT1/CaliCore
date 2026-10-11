/**
 * Vista del catálogo: recibe la lista de ejercicios y dibuja las cadenas de progresión.
 * Es "pura": no hace peticiones ni escucha eventos; solo convierte datos en nodos del DOM.
 */
import { el } from "../../core/dom.js";

const LEVEL_NUMBER = { beginner: 1, intermediate: 2, advanced: 3 };

/** Tres barritas, rellenas según el nivel, más el nombre del nivel como texto. */
function levelIndicator(exercise) {
  const filled = LEVEL_NUMBER[exercise.level] ?? 1;
  const pips = el("span", { className: "pips", attrs: { "aria-hidden": "true" } });
  for (let i = 1; i <= 3; i++) {
    pips.append(el("span", { className: i <= filled ? "pip on" : "pip" }));
  }
  return el("span", { className: "level" }, pips, el("span", { text: exercise.level_display }));
}

/** Datos comunes a un ejercicio: nivel, tipo, descripción y músculos. */
function exerciseBody(exercise) {
  return [
    el("h4", { text: exercise.name }),
    el("div", { className: "meta" }, levelIndicator(exercise), el("span", { text: exercise.category_display })),
    el("p", { text: exercise.description }),
    exercise.muscles ? el("p", { className: "muscles", text: `Músculos: ${exercise.muscles}` }) : "",
  ];
}

/** Un peldaño de una cadena de progresión. */
function buildStep(exercise) {
  const item = el("li", { className: "step", attrs: { "data-level": exercise.level } });
  item.append(
    el("span", { className: "step-index", text: String(exercise.progression_step), attrs: { "aria-hidden": "true" } }),
    el("div", {}, ...exerciseBody(exercise)),
  );
  return item;
}

/** Una cadena completa: título + lista ordenada de peldaños. */
function buildChain(name, exercises) {
  const steps = el("ol", { className: "steps" });
  exercises
    .slice()
    .sort((a, b) => a.progression_step - b.progression_step)
    .forEach((exercise) => steps.append(buildStep(exercise)));

  const count = `${exercises.length} ${exercises.length === 1 ? "paso" : "pasos"}`;
  return el(
    "article",
    { className: "chain" },
    el("div", { className: "chain-title" }, el("h3", { text: name }), el("span", { className: "chain-count", text: count })),
    steps,
  );
}

/** Ejercicios que no pertenecen a ninguna progresión. */
function buildSingles(exercises) {
  const list = el("ul", { className: "singles" });
  exercises.forEach((exercise) => list.append(el("li", { className: "single" }, ...exerciseBody(exercise))));
  return el(
    "article",
    { className: "chain" },
    el("div", { className: "chain-title" }, el("h3", { text: "Ejercicios sueltos" })),
    list,
  );
}

/** Agrupa los ejercicios por progresión y los dibuja dentro de `container`. */
export function renderCatalog(container, exercises) {
  container.replaceChildren(); // vacía el contenedor

  const chains = new Map(); // nombre de la cadena -> ejercicios (Map conserva el orden de inserción)
  const singles = [];

  for (const exercise of exercises) {
    if (exercise.progression_group) {
      if (!chains.has(exercise.progression_group)) chains.set(exercise.progression_group, []);
      chains.get(exercise.progression_group).push(exercise);
    } else {
      singles.push(exercise);
    }
  }

  for (const [name, items] of chains) container.append(buildChain(name, items));
  if (singles.length) container.append(buildSingles(singles));
}
