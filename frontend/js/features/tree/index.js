/**
 * Feature del árbol: la ilustración con los ejercicios encima, zoom, ramas, panel y enlaces.
 *
 *   layout.js     dónde cae cada camino sobre la imagen (lo único que cambia con otra imagen)
 *   tree.view.js  la escena SVG (imagen, foco, venas, savia, nodos)
 *   index.js      este archivo: cámara, interacción, panel y modo de edición
 *
 * La cámara: d3-zoom calcula cuánto mover y escalar según la rueda, el arrastre o el pellizco,
 * y esa transformación se aplica al grupo #tree-camera.
 *
 * Al entrar se ve el árbol COMPLETO llenando toda la página (escala 1 = la imagen estirada al
 * tamaño del escenario). Desde ahí se acerca, se arrastra o se elige una rama.
 */
import { select } from "d3-selection";
import "d3-transition"; // agrega .transition() a las selecciones de D3 (vuelos de cámara)
import { zoom, zoomIdentity, zoomTransform } from "d3-zoom";
import { errorMessage } from "../../core/api.js";
import { $, el } from "../../core/dom.js";
import { EVENTS, on } from "../../core/events.js";
import { fetchExercise, fetchTree } from "../../services/catalog.js";
import { initFavorites } from "../../services/favorites.js";
import { DIFFICULTY_NAMES, difficultyMeter } from "../../ui/difficulty.js";
import { BRANCH_COLORS, placeNodes, SCENE } from "./layout.js";
import { fitScene, renderScene, setSpotlight } from "./tree.view.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const duration = (ms) => (reduceMotion ? 0 : ms);
const LABELS_FROM_SCALE = 2.2; // desde este zoom se muestran todos los nombres

const ui = {
  svg: $("#tree"),
  chips: $("#tree-branches"),
  panel: $("#tree-panel"),
  body: $("#tree-panel-body"),
  status: $("#tree-status"),
};
// La guía inicial del panel se guarda para volver a ella al cerrar una ficha
const guide = [...ui.body.childNodes].map((node) => node.cloneNode(true));

let nodes = [];
let bySlug = {};
let behavior;
let view;
let stage = { width: SCENE.width, height: SCENE.height, sx: 1, sy: 1 }; // tamaño actual del escenario

/* --------------------------------------------------------------------------
   Cámara
   -------------------------------------------------------------------------- */
/**
 * Mueve la cámara a una transformación. Con animación, usa una transición de D3; sin animación
 * (o si se pidió reducir el movimiento) la aplica al instante, sin pasar por una transición.
 */
function moveCamera(transform, ms) {
  const time = duration(ms);
  if (time) view.transition().duration(time).call(behavior.transform, transform);
  else view.call(behavior.transform, transform);
}
/** Vuela para encuadrar un grupo de nodos (o el árbol completo si no hay grupo). */
function frame(group, maxScale = 4) {
  if (!group.length) {
    moveCamera(zoomIdentity, 900);
    return;
  }
  const xs = group.map((n) => n.x);
  const ys = group.map((n) => n.y);
  const pad = 70;
  const [x0, x1, y0, y1] = [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
  const scale = Math.min(maxScale, stage.width / (x1 - x0), stage.height / (y1 - y0));
  const target = zoomIdentity
    .translate(stage.width / 2, stage.height / 2)
    .scale(scale)
    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  moveCamera(target, 1000);
}

function initCamera(camera) {
  behavior = zoom()
    .scaleExtent([1, 7])
    .translateExtent([[0, 0], [stage.width, stage.height]]) // no salir de la ilustración
    .on("zoom", (event) => {
      camera.setAttribute("transform", event.transform);
      ui.svg.classList.toggle("show-labels", event.transform.k >= LABELS_FROM_SCALE);
    });
  view = select(ui.svg).call(behavior);
  const zoomBy = (factor) => {
    if (duration(350)) view.transition().duration(350).call(behavior.scaleBy, factor);
    else view.call(behavior.scaleBy, factor);
  };
  $("#tree-zoom-in").addEventListener("click", () => zoomBy(1.6));
  $("#tree-zoom-out").addEventListener("click", () => zoomBy(1 / 1.6));
  $("#tree-reset").addEventListener("click", () => selectBranch(""));
}

/* --------------------------------------------------------------------------
   Ramas
   -------------------------------------------------------------------------- */
function selectBranch(slug) {
  const group = slug ? nodes.filter((n) => n.branch.slug === slug) : [];
  ui.chips.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.branch === slug)));
  ui.svg.querySelectorAll(".tnode").forEach((g) => g.classList.toggle("is-faded", Boolean(slug) && g.dataset.branch !== slug));
  setSpotlight(ui.svg, group);
  frame(group);
  ui.status.textContent = slug ? `Rama ${group[0].branch.name}: ${group.length} ejercicios.` : "Vista completa del árbol.";
}

function initChips(tree) {
  const chip = (slug, name) => el("button", {
    className: "chip", text: name,
    attrs: { type: "button", "data-branch": slug, "aria-pressed": String(slug === ""), style: `--c:${BRANCH_COLORS[slug] ?? "currentColor"}` },
  });
  ui.chips.replaceChildren(chip("", "Todo el árbol"), ...tree.map((branch) => chip(branch.slug, branch.name)));
  ui.chips.addEventListener("click", (event) => {
    const button = event.target.closest(".chip");
    if (button) selectBranch(button.dataset.branch);
  });
}

/* --------------------------------------------------------------------------
   Resaltado de caminos y panel de la ficha
   -------------------------------------------------------------------------- */
/** Ilumina el camino de un nodo (su vena y sus pasos) y, opcionalmente, sus requisitos. */
function highlight(node, requirementSlugs = []) {
  ui.svg.querySelectorAll(".vein").forEach((vein) => vein.classList.toggle("is-lit", Boolean(node) && vein.dataset.path === node.path.slug));
  ui.svg.querySelectorAll(".tnode").forEach((g) => {
    g.classList.toggle("in-path", Boolean(node) && g.dataset.path === node.path.slug);
    g.classList.toggle("is-req", requirementSlugs.includes(g.dataset.slug));
    g.classList.toggle("is-selected", Boolean(node) && g.dataset.slug === node.slug);
  });
}

function linkList(title, exercises, empty) {
  return el("div", { className: "tp-links" },
    el("h3", { text: title }),
    exercises.length
      ? el("ul", {}, ...exercises.map((exercise) => el("li", {},
        el("a", { text: exercise.name, attrs: { href: `#${exercise.slug}` } }), difficultyMeter(exercise.difficulty))))
      : el("p", { className: "muted", text: empty }));
}

/** Muestra contenido en el panel, con un botón para cerrar y volver a la guía. */
function showInPanel(...content) {
  const close = el("button", { className: "btn btn-ghost btn-icon tp-close", text: "✕", attrs: { type: "button", "aria-label": "Cerrar ficha" } });
  close.addEventListener("click", closePanel);
  ui.body.replaceChildren(close, ...content);
  ui.panel.classList.add("is-open"); // en celular, el panel sube como una hoja desde abajo
}

function closePanel() {
  ui.body.replaceChildren(...guide.map((node) => node.cloneNode(true)));
  ui.panel.classList.remove("is-open");
  highlight(null);
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}

async function openNode(slug, { fly = true } = {}) {
  const node = bySlug[slug];
  if (!node) return;
  highlight(node);
  if (fly) frame([node], 3.2);
  showInPanel(el("p", { className: "status", text: `Cargando ${node.name}…` }));
  try {
    const exercise = await fetchExercise(slug);
    highlight(node, exercise.requirements.map((r) => r.slug));
    showInPanel(
      el("p", { className: "kicker", text: `${exercise.branch} › ${exercise.path} · paso ${exercise.step}`, attrs: { style: `color:${BRANCH_COLORS[node.branch.slug]}` } }),
      el("h2", { text: exercise.name }),
      el("p", { className: "tp-difficulty" }, difficultyMeter(exercise.difficulty),
        el("span", { text: ` Dificultad ${exercise.difficulty} · ${DIFFICULTY_NAMES[exercise.difficulty]}${node.isSummit ? " · cima del camino" : ""}` })),
      el("p", { text: exercise.summary }),
      linkList("Necesitas antes", exercise.requirements, "Es un punto de partida."),
      linkList("Desbloquea", exercise.unlocks, "Es la cima de su camino."),
      el("a", { className: "btn btn-primary", text: "Ver la ficha completa", attrs: { href: `biblioteca.html#${slug}` } }),
    );
  } catch (error) {
    showInPanel(el("p", { className: "load-error", text: `No se pudo cargar el ejercicio. ${errorMessage(error)}` }));
  }
}

/** La dirección manda: arbol.html#muscle-up abre ese ejercicio (también con atrás/adelante). */
function openFromHash() {
  const slug = decodeURIComponent(location.hash.slice(1));
  if (bySlug[slug]) openNode(slug);
}

function initNodes() {
  ui.svg.addEventListener("click", (event) => {
    const g = event.target.closest(".tnode");
    if (g) location.hash = g.dataset.slug; // abre vía hashchange (queda en el historial)
  });
  ui.svg.addEventListener("keydown", (event) => {
    const g = event.target.closest(".tnode");
    if (g && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      location.hash = g.dataset.slug;
    }
  });
  // Al pasar el mouse o enfocar con Tab: iluminar el camino (sin mover la cámara)
  const preview = (event) => {
    const g = event.target.closest?.(".tnode");
    if (g) highlight(bySlug[g.dataset.slug]);
  };
  ui.svg.addEventListener("pointerover", preview);
  ui.svg.addEventListener("focusin", preview);
  window.addEventListener("hashchange", openFromHash);
}

/** Con sesión, los favoritos se marcan en el árbol. */
function markFavorites(saved) {
  ui.svg.querySelectorAll(".tnode").forEach((g) => g.classList.toggle("is-favorite", saved.has(g.dataset.slug)));
}

/* --------------------------------------------------------------------------
   Modo de edición (solo para desarrollo): arbol.html?editar
   Cada clic sobre la imagen muestra sus coordenadas en píxeles de la ilustración,
   listas para copiar en layout.js.
   -------------------------------------------------------------------------- */
function initEditMode() {
  if (!new URLSearchParams(location.search).has("editar")) return;
  const log = el("ol", { className: "edit-log" });
  ui.body.replaceChildren(el("h2", { text: "Modo edición" }), el("p", { className: "muted", text: "Haz clic sobre la imagen para obtener coordenadas [x, y]." }), log);
  ui.panel.classList.add("is-open");
  ui.svg.addEventListener("click", (event) => {
    const point = ui.svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const inSvg = point.matrixTransform(ui.svg.getScreenCTM().inverse()); // pantalla -> coordenadas del SVG
    const [x, y] = zoomTransform(ui.svg).invert([inSvg.x, inSvg.y]);    // se descuenta el zoom actual
    // y se pasa de píxeles del escenario a píxeles de la imagen original (la que usa layout.js)
    log.append(el("li", { text: `[${Math.round(x / stage.sx)}, ${Math.round(y / stage.sy)}]` }));
  });
}

/* --------------------------------------------------------------------------
   Arranque
   -------------------------------------------------------------------------- */
/**
 * Ajusta la escena al tamaño actual del escenario. Si había zoom, se conserva la misma zona
 * a la vista: el desplazamiento se escala en la misma proporción que cambió el escenario.
 */
function resizeStage() {
  const { width, height } = ui.svg.getBoundingClientRect();
  if (!width || !height || (width === stage.width && height === stage.height)) return;
  const previous = stage;
  stage = { width, height, ...fitScene(ui.svg, nodes, width, height) };
  if (!behavior) return; // primera vez: la cámara aún no existe
  behavior.translateExtent([[0, 0], [width, height]]); // no salir de la ilustración
  const t = zoomTransform(ui.svg);
  const kx = width / previous.width;
  const ky = height / previous.height;
  view.call(behavior.transform, zoomIdentity.translate(t.x * kx, t.y * ky).scale(t.k));
}

export async function initTree() {
  let tree;
  try {
    tree = await fetchTree();
  } catch (error) {
    ui.status.textContent = `No pudimos cargar el árbol. ${errorMessage(error)}`;
    return;
  }
  nodes = placeNodes(tree);
  bySlug = Object.fromEntries(nodes.map((node) => [node.slug, node]));
  const camera = renderScene(ui.svg, nodes);
  resizeStage();
  initCamera(camera);
  initChips(tree);
  initNodes();
  initEditMode();
  on(EVENTS.FAVORITES_CHANGED, markFavorites);
  initFavorites();
  // Enlace directo (arbol.html#muscle-up): cuando el árbol termina de crecer, vuela a ese ejercicio
  if (location.hash) setTimeout(openFromHash, duration(2400));
  // Si cambia el tamaño de la ventana, la imagen se vuelve a estirar y los ejercicios se reubican
  new ResizeObserver(resizeStage).observe(ui.svg);
}
