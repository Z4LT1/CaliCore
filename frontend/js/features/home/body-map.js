/**
 * "¿Qué quieres fortalecer?": un índice de zonas del cuerpo.
 *
 * Reemplaza a la antigua silueta: con los nombres de las zonas al lado, el dibujo no aportaba
 * nada y era impreciso. Ahora cada zona muestra sus músculos y cuántos ejercicios la trabajan,
 * y al elegirla se listan esos ejercicios agrupados por dificultad (de Inicio a Élite).
 */
import { gsap } from "gsap";
import { el } from "../../core/dom.js";
import { DIFFICULTY_NAMES, difficultyMeter } from "../../ui/difficulty.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Los nombres coinciden con los músculos del catálogo (backend/apps/exercises/data/catalog.json)
const ZONES = {
  pecho: ["Pecho", ["Pectoral", "Serrato anterior"]],
  espalda: ["Espalda", ["Dorsal ancho", "Romboides"]],
  hombros: ["Hombros", ["Deltoides anterior", "Deltoides posterior", "Trapecio"]],
  brazos: ["Brazos", ["Bíceps", "Tríceps", "Antebrazo"]],
  core: ["Core", ["Abdomen", "Oblicuos", "Lumbar"]],
  cadera: ["Cadera y glúteos", ["Glúteos", "Flexores de cadera"]],
  piernas: ["Piernas", ["Cuádriceps", "Isquiotibiales", "Pantorrillas", "Aductores"]],
};
const PER_LEVEL = 2; // ejercicios por nivel de dificultad; el resto, en la biblioteca

/** Ejercicios que trabajan al menos un músculo de la zona, del más fácil al más difícil. */
function exercisesFor(zone, exercises) {
  const muscles = ZONES[zone][1];
  return exercises
    .filter((exercise) => exercise.muscles.some((muscle) => muscles.includes(muscle)))
    .sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name, "es"));
}

function zoneButton(key, count) {
  const [label, muscles] = ZONES[key];
  return el("button", { className: "zi-row", attrs: { type: "button", "aria-pressed": "false", "data-zone": key } },
    el("span", { className: "zi-name", text: label }),
    el("span", { className: "zi-muscles", text: muscles.join(" · ") }),
    el("span", { className: "zi-count", text: String(count), attrs: { "aria-label": `${count} ejercicios` } }));
}

function renderResult(result, zone, matches) {
  const [label] = ZONES[zone];
  const byLevel = Object.groupBy
    ? Object.groupBy(matches, (exercise) => exercise.difficulty)
    : matches.reduce((acc, exercise) => ((acc[exercise.difficulty] ||= []).push(exercise), acc), {});

  const groups = Object.keys(byLevel).sort().map((level) => {
    const list = byLevel[level];
    return el("div", { className: "zi-level" },
      el("h3", { className: "zi-level-name" }, difficultyMeter(Number(level)), el("span", { text: DIFFICULTY_NAMES[level] })),
      el("ul", {}, ...list.slice(0, PER_LEVEL).map((exercise) => el("li", {},
        el("a", { text: exercise.name, attrs: { href: `biblioteca.html#${exercise.slug}` } }),
        el("small", { text: exercise.branch })))),
      list.length > PER_LEVEL ? el("p", { className: "zi-more", text: `y ${list.length - PER_LEVEL} más` }) : "");
  });

  result.replaceChildren(
    el("p", { className: "zi-summary" },
      el("b", { text: label }), ` · ${matches.length} ejercicios la trabajan`),
    el("div", { className: "zi-levels" }, ...groups),
    el("a", { className: "text-link", text: "Ver todos en la biblioteca →", attrs: { href: "biblioteca.html" } }),
  );
  if (!reduceMotion) gsap.from(result.querySelectorAll(".zi-level"), { opacity: 0, y: 10, duration: 0.45, stagger: 0.05, ease: "expo.out", clearProps: "opacity,transform" });
}

export function initBodyMap({ list, result }, exercises) {
  const matchesByZone = Object.fromEntries(Object.keys(ZONES).map((key) => [key, exercisesFor(key, exercises)]));
  list.replaceChildren(...Object.keys(ZONES).map((key) => zoneButton(key, matchesByZone[key].length)));

  function select(zone) {
    list.querySelectorAll(".zi-row").forEach((row) => row.setAttribute("aria-pressed", String(row.dataset.zone === zone)));
    renderResult(result, zone, matchesByZone[zone]);
  }

  list.addEventListener("click", (event) => {
    const row = event.target.closest(".zi-row");
    if (row) select(row.dataset.zone);
  });
  select("pecho");
}
