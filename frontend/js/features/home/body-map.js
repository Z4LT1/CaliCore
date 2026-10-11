/**
 * Mapa del cuerpo: cada zona agrupa músculos; al elegirla se listan los ejercicios que trabajan
 * al menos uno de ellos. Se elige tocando la silueta o con los botones (accesibles con teclado).
 */
import { el } from "../../core/dom.js";
import { difficultyMeter } from "../../ui/difficulty.js";

// Los nombres coinciden con los músculos del catálogo (backend/apps/exercises/data/catalog.json)
const ZONES = {
  hombros: ["Hombros", ["Deltoides anterior", "Deltoides posterior", "Trapecio"]],
  pecho: ["Pecho", ["Pectoral", "Serrato anterior"]],
  espalda: ["Espalda", ["Dorsal ancho", "Romboides"]],
  brazos: ["Brazos", ["Bíceps", "Tríceps", "Antebrazo"]],
  core: ["Core", ["Abdomen", "Oblicuos", "Lumbar"]],
  cadera: ["Cadera y glúteos", ["Glúteos", "Flexores de cadera"]],
  piernas: ["Piernas", ["Cuádriceps", "Isquiotibiales", "Pantorrillas", "Aductores"]],
};
const SHOWN = 6; // cuántos ejercicios se listan; el resto, en la biblioteca

export function initBodyMap({ chips, figure, result }, exercises) {
  const buttons = {};
  for (const [key, [label]] of Object.entries(ZONES)) {
    buttons[key] = el("button", { className: "chip", text: label, attrs: { type: "button", "aria-pressed": "false", "data-zone": key } });
    chips.append(buttons[key]);
  }

  function select(zone) {
    const [label, muscles] = ZONES[zone];
    Object.entries(buttons).forEach(([key, button]) => button.setAttribute("aria-pressed", String(key === zone)));
    figure.querySelectorAll(".b-zone").forEach((shape) => shape.classList.toggle("is-active", shape.dataset.zone === zone));

    const matches = exercises
      .filter((exercise) => exercise.muscles.some((muscle) => muscles.includes(muscle)))
      .sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name, "es"));

    result.replaceChildren(
      el("p", { className: "zone-count", text: `${matches.length} ejercicios trabajan: ${label.toLowerCase()}` }),
      el("ul", { className: "zone-list" }, ...matches.slice(0, SHOWN).map((exercise) => el("li", {},
        el("a", { text: exercise.name, attrs: { href: `biblioteca.html#${exercise.slug}` } }),
        el("small", { text: exercise.branch }),
        difficultyMeter(exercise.difficulty)))),
      matches.length > SHOWN
        ? el("a", { className: "text-link", text: `Ver los ${matches.length} en la biblioteca →`, attrs: { href: "biblioteca.html" } })
        : "",
    );
  }

  chips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zone]");
    if (button) select(button.dataset.zone);
  });
  figure.addEventListener("click", (event) => {
    const shape = event.target.closest(".b-zone");
    if (shape) select(shape.dataset.zone);
  });
  select("pecho");
}
