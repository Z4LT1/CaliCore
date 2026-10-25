/**
 * Feature del árbol: la escena inmersiva con cámara, parallax, niveles de zoom y la ficha.
 *
 *   layout.js     las capas, el sol, el suelo y por dónde pasa cada camino (unidades de escena)
 *   tree.view.js  lo que se dibuja encima del árbol: zonas, tinta, medallones, savia y foco
 *   index.js      este archivo: composición, cámara, niveles, animaciones e interacción
 *
 * La cámara: d3-zoom traduce la rueda, el arrastre y el pellizco en una transformación
 * (x, y, k). Cada capa la sigue según su profundidad (data-depth en arbol.html): el fondo se
 * mueve menos que el árbol y la niebla delantera un poco más. Esa diferencia es el parallax.
 *
 * Niveles (para no mostrar 79 ejercicios a la vez):
 *   0  árbol completo: solo las seis zonas
 *   1  una rama elegida (o zoom medio): sus caminos en tinta y sus medallones
 *   2  un ejercicio abierto: su camino destacado, la savia y los nombres
 *
 * Animación: GSAP para la entrada y el ambiente (niebla, rayos de sol); d3 solo para la cámara.
 * Con "reducir movimiento" no hay entrada ni ambiente: todo aparece quieto y en su lugar.
 */
import { gsap } from "gsap";
import { select } from "d3-selection";
import "d3-transition"; // agrega .transition() a las selecciones de D3 (vuelos de cámara)
import { zoom, zoomIdentity, zoomTransform } from "d3-zoom";
import { errorMessage } from "../../core/api.js";
import { $, el, svg } from "../../core/dom.js";
import { EVENTS, on } from "../../core/events.js";
import { fetchExercise, fetchTree } from "../../services/catalog.js";
import { initFavorites } from "../../services/favorites.js";
import { DIFFICULTY_NAMES, difficultyMeter } from "../../ui/difficulty.js";
import { BRANCH_COLORS, buildNodes, GROUND_Y, IMAGES, PATH_LINES, SCENE, SOURCE_DENSITY, SUN, TREE_BOX } from "./layout.js";
import { clearSap, growSap, renderScene, setSpotlight, showInk } from "./tree.view.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobileQuery = window.matchMedia("(max-width: 760px)");
const duration = (ms) => (reduceMotion ? 0 : ms);
const LEVEL1_K = 1.7; // desde este zoom se ven los medallones aunque no haya rama elegida
const NAMES_K = 3.2;  // desde este zoom se ven los nombres de los ejercicios a la vista

const ui = {
  page: $(".tree-page"),
  stage: $("#tree-stage"),
  plaque: $(".tree-plaque"),
  layers: [...document.querySelectorAll("#tree-stage .layer")],
  worldFondo: $("#world-fondo"),
  worldArbol: $("#world-arbol"),
  imgFondo: $("#img-fondo"),
  imgArbol: $("#img-arbol"),
  rays: $("#sun-rays"),
  fogBack: $("#fog-back"),
  fogFront: $("#fog-front"),
  svg: $("#tree"),
  crumbs: $("#tree-crumbs"),
  branches: $("#tree-branches"),
  sheet: $("#tree-sheet"),
  status: $("#tree-status"),
};

let tree = [];
let nodes = [];
let bySlug = {};
let behavior;
let view;
let size = { width: 0, height: 0 };
let base = { s: 1, x: 0, y: 0 };        // dónde queda el árbol con la cámara en reposo
const state = { branch: "", path: "", node: "", level: -1, names: false };
const fogTweens = [];

/* ==========================================================================
   Composición: dónde va cada capa según el tamaño de la pantalla
   ========================================================================== */
/**
 * El fondo CUBRE todo el escenario (como un papel tapiz, sin deformarse) y queda apoyado abajo.
 * El árbol se ve COMPLETO, lo más grande posible, con las raíces sobre el cerro del fondo.
 * Como el árbol tiene fondo transparente, nunca quedan franjas vacías a los costados.
 */
function compose() {
  const { width, height } = ui.stage.getBoundingClientRect();
  if (!width || !height) return false;
  size = { width, height };
  const mobile = mobileQuery.matches;

  // Fondo: escala de "cover" (un poco más grande para que el parallax no muestre bordes)
  const sb = Math.max(width / SCENE.width, height / SCENE.height) * 1.04;
  const bx = (width - SCENE.width * sb) / 2;
  const by = height - SCENE.height * sb;
  setWorld(ui.worldFondo, bx, by, sb);

  // Suelo: en celular se sube un poco, para que los controles de abajo no tapen las raíces
  const reserve = mobile ? 84 : 0;
  const ground = Math.min(by + sb * GROUND_Y, height - reserve);

  // Árbol: completo, lo más grande posible y CENTRADO en la pantalla, con las raíces apoyadas
  // en el suelo. La lámina flota encima, como el panel de un mapa (en celular, el árbol va debajo)
  const top = mobile ? 150 : 8;
  const pad = mobile ? 0 : 24;
  const room = width - 2 * pad;
  const treeWidth = TREE_BOX.x1 - TREE_BOX.x0;
  const s = Math.min(room / treeWidth, (ground - top) / SCENE.height);
  const x = (width - treeWidth * s) / 2 - TREE_BOX.x0 * s;
  base = { s, x, y: ground - SCENE.height * s };
  setWorld(ui.worldArbol, base.x, base.y, s);

  // Niebla: una banda en el valle (detrás del árbol) y otra baja, delante de las raíces
  placeFog(ui.fogBack, by + sb * 700, sb * 420);
  placeFog(ui.fogFront, ground - s * 230, s * 330);

  // Rayos de sol: centrados en el sol del fondo (en unidades de escena, dentro de su capa)
  const R = 1150;
  Object.assign(ui.rays.style, { left: `${SUN.x - R}px`, top: `${SUN.y - R}px`, width: `${2 * R}px`, height: `${2 * R}px` });
  return true;
}

/** Borde derecho de la lámina principal (en escritorio, el árbol se ubica a su derecha). */
function freeLeft() {
  const stageBox = ui.stage.getBoundingClientRect();
  return ui.plaque.getBoundingClientRect().right - stageBox.left + 16;
}

function setWorld(world, x, y, scale) {
  world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function placeFog(fog, top, height) {
  Object.assign(fog.style, { top: `${top}px`, height: `${height}px`, backgroundImage: `url("${IMAGES.niebla}")` });
  fog.dataset.tile = String(height * 4); // la textura mide 2048 × 512: su ancho es 4 veces su alto
}

/** Niebla que avanza sin fin: se desplaza el fondo exactamente un ancho de textura y se repite. */
function startFog() {
  fogTweens.forEach((tween) => tween.kill());
  fogTweens.length = 0;
  if (reduceMotion) return;
  [[ui.fogBack, 140, 1], [ui.fogFront, 90, -1]].forEach(([fog, seconds, direction]) => {
    const tile = Number(fog.dataset.tile);
    fogTweens.push(gsap.fromTo(fog, { backgroundPositionX: 0 }, { backgroundPositionX: direction * tile, duration: seconds, ease: "none", repeat: -1 }));
  });
}

/**
 * Imagen liviana primero; cuando la grande termina de bajar (sin bloquear nada), se reemplaza.
 * Devuelve una promesa que se cumple cuando la liviana ya se puede dibujar.
 */
function loadProgressive(img, { low, high }) {
  if (!img.getAttribute("src")) img.src = low; // normalmente ya viene en el HTML
  return img.decode().catch(() => {}).then(() => {
    const hi = new Image();
    hi.src = high;
    hi.decode().then(() => { img.src = high; }).catch(() => {});
  });
}

/** El punto donde nace un camino (junto al tronco), como punto de escena. */
const pathStart = (slug) => ({ x: PATH_LINES[slug][0][0], y: PATH_LINES[slug][0][1] });

/* ==========================================================================
   Cámara y parallax
   ========================================================================== */
/**
 * Aplica la transformación de la cámara a cada capa según su profundidad f.
 * Con f = 1 la capa sigue exactamente a la cámara; con f < 1 se desplaza y se agranda menos.
 * La cuenta mantiene la misma idea: el centro de la capa se mueve f veces lo que se mueve el
 * centro de la pantalla, y el zoom crece f veces lo que crece el de la cámara.
 */
function applyCamera(t) {
  const cx = size.width / 2;
  const cy = size.height / 2;
  for (const layer of ui.layers) {
    const f = Number(layer.dataset.depth);
    const k = 1 + (t.k - 1) * f;
    const x = cx + f * ((t.k - 1) * cx + t.x) - k * cx;
    const y = cy + f * ((t.k - 1) * cy + t.y) - k * cy;
    layer.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
  }
  ui.svg.style.setProperty("--inv", String(1 / (base.s * t.k))); // medallones del mismo tamaño en pantalla
  updateLevel(t.k);
}

function moveCamera(transform, ms) {
  const time = duration(ms);
  if (time) view.transition().duration(time).ease(easeInOutCubic).call(behavior.transform, transform);
  else view.call(behavior.transform, transform);
}
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Zoom máximo: hasta donde la imagen grande sigue nítida (con un poco de margen). */
const maxScale = () => Math.min(10, Math.max(2.5, (SOURCE_DENSITY * 1.3) / base.s));

/** Zona libre de la pantalla para encuadrar: descuenta la ficha si está abierta. */
function freeArea() {
  const open = !ui.sheet.hidden;
  if (mobileQuery.matches) {
    // En celular: entre el borde de abajo de la lámina y el de arriba de la ficha (o los controles)
    const top = ui.stage.getBoundingClientRect().top;
    const y0 = ui.plaque.getBoundingClientRect().bottom - top + 8;
    const y1 = open ? ui.sheet.getBoundingClientRect().top - top - 8 : size.height - 70;
    return { x0: 0, x1: size.width, y0, y1: Math.max(y1, y0 + 120) };
  }
  const sheet = open ? ui.sheet.offsetWidth + 32 : 0;
  return { x0: freeLeft(), x1: size.width - sheet, y0: 0, y1: size.height };
}

/** Transformación que encuadra un grupo de puntos (en unidades de escena) en la zona libre. */
function frameTransform(points, kMax) {
  const area = freeArea();
  const xs = points.map((p) => base.x + p.x * base.s);
  const ys = points.map((p) => base.y + p.y * base.s);
  const pad = 60;
  const [x0, x1, y0, y1] = [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
  const k = Math.max(1, Math.min(kMax, maxScale(), (area.x1 - area.x0) / (x1 - x0), (area.y1 - area.y0) / (y1 - y0)));
  return zoomIdentity
    .translate((area.x0 + area.x1) / 2, (area.y0 + area.y1) / 2)
    .scale(k)
    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
}

function initCamera() {
  behavior = zoom()
    .scaleExtent([1, maxScale()])
    .translateExtent([[0, 0], [size.width, size.height]]) // no salir del escenario
    .on("zoom", (event) => applyCamera(event.transform));
  view = select(ui.stage).call(behavior).on("dblclick.zoom", null);
  const zoomBy = (factor) => {
    if (duration(350)) view.transition().duration(350).call(behavior.scaleBy, factor);
    else view.call(behavior.scaleBy, factor);
  };
  $("#tree-zoom-in").addEventListener("click", () => zoomBy(1.6));
  $("#tree-zoom-out").addEventListener("click", () => zoomBy(1 / 1.6));
  $("#tree-reset").addEventListener("click", () => selectBranch(""));
  applyCamera(zoomIdentity);
}

/** Al cambiar el tamaño de la ventana se recompone la escena y se conserva la zona a la vista. */
function onResize() {
  const previous = size;
  if (!compose()) return;
  if (size.width === previous.width && size.height === previous.height) return;
  behavior.scaleExtent([1, maxScale()]).translateExtent([[0, 0], [size.width, size.height]]);
  const t = zoomTransform(ui.stage);
  const kx = size.width / (previous.width || size.width);
  const ky = size.height / (previous.height || size.height);
  view.call(behavior.transform, zoomIdentity.translate(t.x * kx, t.y * ky).scale(t.k));
  startFog();
}

/* ==========================================================================
   Niveles: qué se ve según la rama elegida y el zoom
   ========================================================================== */
function updateLevel(k = zoomTransform(ui.stage).k) {
  const level = state.node ? 2 : state.branch || k >= LEVEL1_K ? 1 : 0;
  const names = k >= NAMES_K;
  if (level === state.level && names === state.names) return;
  state.level = level;
  state.names = names;
  ui.svg.dataset.level = String(level);
  ui.svg.classList.toggle("show-names", names);
  // Con teclado solo se recorre lo que se ve: las zonas en el nivel 0, los medallones después
  ui.svg.querySelectorAll(".zone").forEach((z) => z.setAttribute("tabindex", level === 0 ? "0" : "-1"));
  ui.svg.querySelectorAll(".tnode").forEach((g) => {
    const visible = level > 0 && !g.classList.contains("is-faded");
    g.setAttribute("tabindex", visible ? "0" : "-1");
  });
  // Sin rama elegida, al acercarse se insinúan todos los caminos en tinta
  if (!state.branch) showInk(ui.svg, level >= 1 ? Object.keys(groupBy(nodes, (n) => n.path.slug)) : []);
}

const groupBy = (list, key) => list.reduce((acc, item) => ((acc[key(item)] ||= []).push(item), acc), {});
const pathsOf = (branchSlug) => [...new Set(nodes.filter((n) => n.branch.slug === branchSlug).map((n) => n.path.slug))];

/** Tinta que corresponde a la selección actual (la base sobre la que se suman las vistas previas). */
function selectionInk() {
  if (!state.branch) return state.level >= 1 ? Object.keys(groupBy(nodes, (n) => n.path.slug)) : [];
  return pathsOf(state.branch);
}

/* ==========================================================================
   Ramas, migas y vista previa
   ========================================================================== */
function selectBranch(slug, { fly = true } = {}) {
  state.branch = slug;
  state.path = "";
  state.node = "";
  hideSheet();
  clearSap(ui.svg);
  const group = slug ? nodes.filter((n) => n.branch.slug === slug) : [];
  ui.svg.querySelectorAll(".tnode").forEach((g) => {
    g.classList.toggle("is-faded", Boolean(slug) && g.dataset.branch !== slug);
    g.classList.remove("in-path", "is-selected", "is-req");
  });
  setSpotlight(ui.svg, group);
  state.level = -1; // fuerza a recalcular el nivel
  updateLevel();
  showInk(ui.svg, selectionInk());
  renderBranchButtons();
  renderCrumbs();
  if (fly) moveCamera(slug ? frameTransform([...group, ...pathsOf(slug).map(pathStart)], 3) : zoomIdentity, 1100);
  ui.status.textContent = slug ? `Rama ${group[0].branch.name}: ${group.length} ejercicios.` : "Árbol completo.";
  if (location.hash && !state.node) history.replaceState(null, "", location.pathname + location.search);
}

function renderBranchButtons() {
  ui.branches.replaceChildren(...tree.map((branch) => {
    const count = nodes.filter((n) => n.branch.slug === branch.slug).length;
    return el("button", {
      className: "branch-btn",
      attrs: { type: "button", "data-branch": branch.slug, "aria-pressed": String(state.branch === branch.slug), style: `--c:${BRANCH_COLORS[branch.slug]}` },
    }, el("span", { className: "branch-seal", attrs: { "aria-hidden": "true" } }), el("span", { text: branch.name }), el("small", { text: String(count) }));
  }));
}

function renderCrumbs() {
  const crumb = (text, action, current) => el("li", {}, current
    ? el("span", { text, attrs: { "aria-current": "location" } })
    : el("button", { className: "crumb-btn", text, attrs: { type: "button", "data-action": action } }));
  const branch = tree.find((b) => b.slug === state.branch);
  const path = branch?.paths.find((p) => p.slug === state.path);
  ui.crumbs.replaceChildren(
    crumb("Árbol completo", "root", !branch),
    ...(branch ? [crumb(branch.name, "branch", !path)] : []),
    ...(path ? [crumb(path.name, "", true)] : []),
  );
}

/** Al pasar el cursor por una zona o un medallón, se dibuja en tinta lo que ilumina (sin mover la cámara). */
function preview(paths, pathSlug = "") {
  showInk(ui.svg, [...new Set([...selectionInk(), ...paths])], { strong: pathSlug ? [pathSlug] : [] });
  ui.svg.querySelectorAll(".tnode").forEach((g) => g.classList.toggle("in-path", Boolean(pathSlug) && g.dataset.path === pathSlug));
}
function endPreview() {
  preview([], state.path);
}

/* ==========================================================================
   Clic en cualquier parte del árbol
   En la vista completa no hace falta apuntar a una zona: se elige la rama más cercana al cursor.
   ========================================================================== */
const PICK_RADIUS = 240; // unidades de escena: hasta dónde "alcanza" el cursor para elegir una rama

/** Pasa un evento del mouse a unidades de escena (descontando la cámara y la composición). */
function scenePoint(event) {
  const box = ui.stage.getBoundingClientRect();
  const [qx, qy] = zoomTransform(ui.stage).invert([event.clientX - box.left, event.clientY - box.top]);
  return { x: (qx - base.x) / base.s, y: (qy - base.y) / base.s };
}

/** El ejercicio más cercano a un punto de la escena, y a qué distancia está. */
function nearest(point) {
  let best = null;
  let distance = Infinity;
  for (const node of nodes) {
    const d = Math.hypot(node.x - point.x, node.y - point.y);
    if (d < distance) [best, distance] = [node, d];
  }
  return { node: best, distance };
}

let hotBranch = "";
/** Marca la rama "caliente" (la que se elegiría con un clic): tinta, nombre y cursor de mano. */
function setHot(slug) {
  if (slug === hotBranch) return;
  hotBranch = slug;
  ui.stage.classList.toggle("is-pickable", Boolean(slug));
  ui.svg.querySelectorAll(".zone").forEach((z) => z.classList.toggle("is-hot", z.dataset.branch === slug));
  if (slug) preview(pathsOf(slug));
  else endPreview();
}

const onHUD = (target) => target.closest?.(".zone, .tnode, .troots");

function initPicking() {
  let frame = 0;
  ui.stage.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (state.level !== 0 || event.buttons || onHUD(event.target)) return setHot("");
      const { node, distance } = nearest(scenePoint(event));
      setHot(node && distance < PICK_RADIUS ? node.branch.slug : "");
    });
  });
  ui.stage.addEventListener("pointerleave", () => setHot(""));
  // d3-zoom no deja pasar el clic si hubo arrastre: este clic es "intencional"
  ui.stage.addEventListener("click", (event) => {
    if (onHUD(event.target) || new URLSearchParams(location.search).has("editar")) return;
    const { node, distance } = nearest(scenePoint(event));
    if (!node) return;
    const k = zoomTransform(ui.stage).k;
    const pixels = distance * base.s * k; // distancia real en la pantalla
    if (state.level === 0) {
      if (distance < PICK_RADIUS) { setHot(""); selectBranch(node.branch.slug); }
    } else if (pixels < 28) {
      location.hash = node.slug; // clic casi encima de un medallón: se abre aunque no se haya acertado
    } else if (node.branch.slug !== state.branch && distance < PICK_RADIUS) {
      selectBranch(node.branch.slug); // clic sobre otra parte del árbol: se pasa a esa rama
    }
  });
}

function initInteractions() {
  ui.branches.addEventListener("click", (event) => {
    const button = event.target.closest(".branch-btn");
    if (button) selectBranch(state.branch === button.dataset.branch ? "" : button.dataset.branch);
  });
  ui.crumbs.addEventListener("click", (event) => {
    const button = event.target.closest(".crumb-btn");
    if (button) selectBranch(button.dataset.action === "branch" ? state.branch : "");
  });

  // Zonas (nivel 0)
  const zoneOf = (event) => event.target.closest?.(".zone");
  ui.svg.addEventListener("pointerover", (event) => {
    const z = zoneOf(event);
    if (z) return preview(pathsOf(z.dataset.branch));
    const g = event.target.closest?.(".tnode");
    if (g) preview([g.dataset.path], g.dataset.path);
  });
  ui.svg.addEventListener("pointerout", (event) => {
    if (zoneOf(event) || event.target.closest?.(".tnode")) endPreview();
  });
  ui.svg.addEventListener("focusin", (event) => {
    const z = zoneOf(event);
    if (z) return preview(pathsOf(z.dataset.branch));
    const g = event.target.closest(".tnode");
    if (g) preview([g.dataset.path], g.dataset.path);
  });
  ui.svg.addEventListener("focusout", endPreview);

  // Clic o Enter: una zona elige su rama; un medallón abre su ejercicio (vía la dirección)
  const activate = (target) => {
    const z = target.closest(".zone");
    if (z) return selectBranch(z.dataset.branch);
    const g = target.closest(".tnode");
    if (g) location.hash = g.dataset.slug; // queda en el historial: atrás vuelve al anterior
  };
  ui.svg.addEventListener("click", (event) => activate(event.target));
  ui.svg.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      if (!event.target.closest(".zone, .tnode")) return;
      event.preventDefault();
      activate(event.target);
    }
  });
  // Esc sube un nivel: cierra la ficha y, si no hay ficha, vuelve al árbol completo
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (state.node) selectBranch(state.branch);
    else if (state.branch) selectBranch("");
  });
  window.addEventListener("hashchange", openFromHash);
}

/* ==========================================================================
   Ficha del ejercicio
   ========================================================================== */
const ICON_CLOSE = () => svg("svg", { attrs: { viewBox: "0 0 24 24", "aria-hidden": "true" } }, svg("path", { attrs: { d: "M6 6l12 12M18 6L6 18" } }));

function showSheet(...content) {
  const close = el("button", { className: "paper-btn sheet-close", attrs: { type: "button", "aria-label": "Cerrar ficha" } }, ICON_CLOSE());
  close.addEventListener("click", () => selectBranch(state.branch));
  ui.sheet.replaceChildren(close, ...content);
  if (ui.sheet.hidden) {
    ui.sheet.hidden = false;
    if (!reduceMotion) gsap.from(ui.sheet, { opacity: 0, x: mobileQuery.matches ? 0 : 24, y: mobileQuery.matches ? 40 : 0, duration: 0.5, ease: "expo.out", clearProps: "opacity,transform" });
  }
}
function hideSheet() {
  ui.sheet.hidden = true;
  ui.sheet.replaceChildren();
}

function linkList(title, exercises, empty) {
  return el("div", { className: "sheet-links" },
    el("h3", { text: title }),
    exercises.length
      ? el("ul", {}, ...exercises.map((exercise) => el("li", {},
        el("a", { text: exercise.name, attrs: { href: `#${exercise.slug}` } }), difficultyMeter(exercise.difficulty))))
      : el("p", { className: "sheet-empty", text: empty }));
}

async function openNode(slug) {
  const node = bySlug[slug];
  if (!node) return;
  const pathNodes = nodes.filter((n) => n.path.slug === node.path.slug);
  // Si cambia de rama, la rama nueva queda elegida (tinta, foco y botones)
  if (state.branch !== node.branch.slug) selectBranch(node.branch.slug, { fly: false });
  state.path = node.path.slug;
  state.node = slug;
  ui.svg.querySelectorAll(".tnode").forEach((g) => {
    g.classList.toggle("is-selected", g.dataset.slug === slug);
    g.classList.toggle("in-path", g.dataset.path === node.path.slug);
  });
  setSpotlight(ui.svg, pathNodes);
  showInk(ui.svg, selectionInk(), { strong: [node.path.slug] });
  renderCrumbs();
  state.level = -1;
  updateLevel();

  showSheet(el("p", { className: "sheet-loading", text: `Cargando ${node.name}…` }));
  // La cámara encuadra el camino completo (con la ficha ya abierta, para descontar su ancho)
  const target = frameTransform([...pathNodes, pathStart(node.path.slug)], 4.2);
  moveCamera(target, 1100);
  growSap(ui.svg, node, 1 / (base.s * target.k));
  ui.status.textContent = `${node.name}: ${node.path.name}, paso ${node.step}.`;

  try {
    const exercise = await fetchExercise(slug);
    if (state.node !== slug) return; // mientras cargaba, se eligió otro
    const required = exercise.requirements.map((r) => r.slug);
    ui.svg.querySelectorAll(".tnode").forEach((g) => g.classList.toggle("is-req", required.includes(g.dataset.slug)));
    showSheet(
      el("h2", { text: exercise.name }),
      el("p", { className: "sheet-path", attrs: { style: `--c:${BRANCH_COLORS[node.branch.slug]}` } },
        el("span", { className: "branch-seal", attrs: { "aria-hidden": "true" } }),
        el("span", { text: `${exercise.branch} · ${exercise.path} · paso ${exercise.step} de ${pathNodes.length}` })),
      el("p", { className: "sheet-difficulty" }, difficultyMeter(exercise.difficulty),
        el("span", { text: `${DIFFICULTY_NAMES[exercise.difficulty]}${node.isSummit ? " · cima del camino" : ""}` })),
      el("p", { className: "sheet-summary", text: exercise.summary }),
      linkList("Necesitas antes", exercise.requirements, "Es un punto de partida."),
      linkList("Desbloquea", exercise.unlocks, "Es la cima de su camino."),
      el("a", { className: "btn btn-primary sheet-cta", text: "Ver la ficha completa", attrs: { href: `biblioteca.html#${slug}` } }),
    );
  } catch (error) {
    showSheet(el("p", { className: "load-error", text: `No se pudo cargar el ejercicio. ${errorMessage(error)}` }));
  }
}

/** La dirección manda: arbol.html#muscle-up abre ese ejercicio (también con atrás/adelante). */
function openFromHash() {
  const slug = decodeURIComponent(location.hash.slice(1));
  if (bySlug[slug]) openNode(slug);
  else if (state.node) selectBranch(state.branch);
}

/** Con sesión, los favoritos se marcan en el árbol. */
function markFavorites(saved) {
  ui.svg.querySelectorAll(".tnode").forEach((g) => g.classList.toggle("is-favorite", saved.has(g.dataset.slug)));
}

/* ==========================================================================
   Entrada y ambiente (GSAP)
   ========================================================================== */
/**
 * Un solo momento de autor: el paisaje aparece, el sol abre sus rayos, el árbol crece desde
 * las raíces y, al final, se escriben las seis zonas. Todo usa gsap.from(): el estado final es
 * el que ya está en el HTML y el CSS, así que si la animación no corre, la página igual se ve bien.
 */
function intro() {
  if (reduceMotion) return;
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  tl.from(ui.imgFondo, { opacity: 0, scale: 1.06, filter: "blur(10px)", transformOrigin: "50% 75%", duration: 1.8, clearProps: "filter" }, 0)
    .from(ui.rays, { opacity: 0, scale: 0.6, rotation: -8, duration: 2.6, ease: "power2.out" }, 0.2)
    .from(ui.imgArbol, { clipPath: "inset(100% 0% 0% 0%)", duration: 2.1, ease: "power3.inOut" }, 0.35)
    .from([ui.fogBack, ui.fogFront], { opacity: 0, duration: 2.4, ease: "power1.out" }, 0.8)
    .from(".tree-plaque, .tree-controls", { opacity: 0, y: 14, duration: 0.9, stagger: 0.12, clearProps: "opacity,transform" }, 0.6)
    .from(ui.svg.querySelector(".zones"), { opacity: 0, duration: 0.8 }, 2)
    .from(ui.svg.querySelectorAll(".zone-lead"), { strokeDashoffset: 1, duration: 0.9, stagger: 0.07, ease: "power2.out" }, 2);
}

/** Ambiente: los rayos giran muy despacio y el sol "respira". La niebla la mueve startFog(). */
function ambient() {
  if (reduceMotion) return;
  gsap.to(ui.rays, { rotation: "+=360", duration: 420, ease: "none", repeat: -1 });
  gsap.to(ui.rays, { "--glow": 0.85, duration: 6, ease: "sine.inOut", yoyo: true, repeat: -1 });
}

/* ==========================================================================
   Modo de edición (solo para desarrollo): arbol.html?editar
   Cada clic sobre el árbol muestra sus coordenadas en unidades de escena, listas para layout.js.
   ========================================================================== */
function initEditMode() {
  if (!new URLSearchParams(location.search).has("editar")) return;
  const log = el("ol", { className: "edit-log" });
  ui.sheet.hidden = false;
  ui.sheet.replaceChildren(el("h2", { text: "Modo edición" }), el("p", { text: "Haz clic sobre el árbol para obtener coordenadas [x, y]." }), log);
  ui.stage.addEventListener("click", (event) => {
    const box = ui.stage.getBoundingClientRect();
    const [qx, qy] = zoomTransform(ui.stage).invert([event.clientX - box.left, event.clientY - box.top]);
    log.append(el("li", { text: `[${Math.round((qx - base.x) / base.s)}, ${Math.round((qy - base.y) / base.s)}]` }));
  });
}

/* ==========================================================================
   Arranque
   ========================================================================== */
export async function initTree() {
  // La escena entra cuando las dos imágenes livianas están listas (antes se ve solo el papel)
  const imagesReady = Promise.all([loadProgressive(ui.imgFondo, IMAGES.fondo), loadProgressive(ui.imgArbol, IMAGES.arbol)]);
  compose();
  startFog();
  ambient();

  try {
    tree = await fetchTree();
  } catch (error) {
    ui.status.textContent = `No pudimos cargar el árbol. ${errorMessage(error)}`;
    ui.crumbs.replaceChildren(el("li", { className: "load-error", text: `No pudimos cargar el árbol. ${errorMessage(error)}` }));
    return;
  }
  nodes = buildNodes(tree);
  bySlug = Object.fromEntries(nodes.map((node) => [node.slug, node]));
  renderScene(ui.svg, tree, nodes);
  renderBranchButtons();
  renderCrumbs();
  initCamera();
  initInteractions();
  initPicking();
  initEditMode();
  imagesReady.then(() => {
    ui.stage.classList.add("is-ready");
    intro();
  });
  on(EVENTS.FAVORITES_CHANGED, markFavorites);
  initFavorites();
  new ResizeObserver(onResize).observe(ui.stage);
  mobileQuery.addEventListener("change", onResize);

  // Enlaces directos: arbol.html#muscle-up abre un ejercicio; arbol.html?rama=empuje elige una rama
  const branchParam = new URLSearchParams(location.search).get("rama");
  const wait = duration(location.hash || branchParam ? 1800 : 0);
  setTimeout(() => {
    if (location.hash) openFromHash();
    else if (tree.some((b) => b.slug === branchParam)) selectBranch(branchParam);
  }, wait);
}
