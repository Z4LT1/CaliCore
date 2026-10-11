/**
 * Vistas del perfil: reciben datos y devuelven nodos del DOM. No hacen peticiones ni escuchan eventos.
 */
import { el } from "../../core/dom.js";
import { DIFFICULTY_NAMES, difficultyMeter } from "../../ui/difficulty.js";

/** "2026-10-11" -> "octubre de 2026". Se agrega la hora para que la zona horaria no cambie el día. */
function monthYear(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

export function renderIdentity(me) {
  return [
    el("span", { className: "avatar", text: me.username.charAt(0).toUpperCase(), attrs: { "aria-hidden": "true" } }),
    el("div", {},
      el("p", { className: "kicker", text: "Tu perfil" }),
      el("h1", { text: me.username }),
      el("p", { className: "muted", text: [me.email, `En CaliCore desde ${monthYear(me.date_joined)}`].filter(Boolean).join(" · ") })),
  ];
}

export function renderStats(stats) {
  const item = (value, label, extra) => el("li", {}, el("b", { text: String(value) }), el("span", { text: label }), extra || "");
  return [
    item(stats.saved, "ejercicios guardados"),
    item(stats.branches, "de 5 ramas exploradas"),
    item(stats.summits, "cimas en la mira"),
    stats.hardest
      ? item(stats.hardest.difficulty, `tu meta más alta (${DIFFICULTY_NAMES[stats.hardest.difficulty].toLowerCase()})`,
        el("small", { text: stats.hardest.name }))
      : item("—", "tu meta más alta"),
  ];
}

/** Una barra por rama: cuánto de ella tiene guardado el usuario. */
export function renderCoverage(rows) {
  return rows.map(({ name, saved, total }) => el("li", {},
    el("span", { className: "cov-name", text: name }),
    el("span", { className: "cov-bar", attrs: { role: "img", "aria-label": `${saved} de ${total} ejercicios guardados` } },
      el("i", { attrs: { style: `--p:${total ? saved / total : 0}` } })),
    el("span", { className: "cov-count", text: `${saved}/${total}` })));
}

/** Metas: cada favorito difícil con los pasos de su camino que llevan hasta él. */
export function renderGoals(goalList, savedSlugs) {
  return goalList.map(({ exercise, path, steps }) => el("article", { className: "goal" },
    el("header", { className: "goal-head" },
      el("div", {},
        el("p", { className: "goal-path", text: `${exercise.branch} › ${path.name}` }),
        el("h3", {}, el("a", { text: exercise.name, attrs: { href: `biblioteca.html#${exercise.slug}` } }))),
      difficultyMeter(exercise.difficulty)),
    el("p", { className: "goal-lead muted", text: `${steps.length - 1 === 0 ? "Es el primer paso de su camino." : `${steps.length - 1} pasos antes de llegar:`}` }),
    el("ol", { className: "goal-steps" }, ...steps.map((step) => el("li", {
      className: [step.slug === exercise.slug ? "is-goal" : "", savedSlugs.has(step.slug) ? "is-saved" : ""].join(" ").trim(),
    }, el("a", { text: step.name, attrs: { href: `biblioteca.html#${step.slug}` } })))),
  ));
}
