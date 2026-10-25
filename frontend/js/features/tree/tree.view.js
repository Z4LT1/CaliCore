/**
 * Vista del árbol: dibuja, encima de la ilustración, todo lo que es CaliCore (zonas, caminos,
 * ejercicios, raíces y la savia). Trabaja en unidades de escena (2000 × 1200, ver layout.js).
 * No maneja la cámara ni los eventos: eso lo hace index.js.
 *
 * Capas del SVG, de atrás hacia adelante:
 *   1. el velo: oscurece todo menos el "foco" (la rama o el camino elegido)
 *   2. la tinta: cada camino dibujado como un trazo de grabado (doble línea con marcas)
 *   3. la savia: franja de luz que sube del tronco al ejercicio elegido
 *   4. las zonas (nivel "árbol completo"), las raíces y los medallones de cada ejercicio
 *
 * Tamaño constante en pantalla: los medallones y los textos viven dentro de un grupo ".inv"
 * que se contraescala con la variable CSS --inv (= 1 / zoom total). Así, al acercarse, el árbol
 * crece pero los medallones no se vuelven gigantes. Los trazos usan vector-effect para lo mismo.
 */
import { gsap } from "gsap";
import { svg } from "../../core/dom.js";
import { BRANCH_COLORS, PATH_LINES, ROOTS, smoothPath, ZONES } from "./layout.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const BIG = { x: -4000, y: -4000, width: 10000, height: 9200 }; // el velo cubre todo el escenario

/* --------------------------------------------------------------------------
   Piezas
   -------------------------------------------------------------------------- */
function defs(paths) {
  return svg("defs", {},
    // Foco: manchas negras desenfocadas sobre una máscara blanca (blanco = se oscurece)
    svg("filter", { attrs: { id: "spot-blur", x: "-50%", y: "-50%", width: "200%", height: "200%" } },
      svg("feGaussianBlur", { attrs: { stdDeviation: 34 } })),
    svg("mask", { attrs: { id: "dim-mask", maskUnits: "userSpaceOnUse", ...BIG } },
      svg("rect", { attrs: { ...BIG, fill: "white" } }),
      svg("g", { attrs: { id: "spot", filter: "url(#spot-blur)" } })),
    // Brillo de la savia
    svg("filter", { attrs: { id: "sap-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" } },
      svg("feGaussianBlur", { attrs: { stdDeviation: 3, result: "b" } }),
      svg("feMerge", {}, svg("feMergeNode", { attrs: { in: "b" } }), svg("feMergeNode", { attrs: { in: "SourceGraphic" } }))),
    // Una máscara por camino: un trazo blanco que se "desenrolla" y deja ver la tinta de a poco
    ...paths.map((slug) => svg("mask", { attrs: { id: `reveal-${slug}`, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 2000, height: 1200 } },
      svg("path", { className: "reveal-stroke", attrs: { d: smoothPath(PATH_LINES[slug]), pathLength: 1, "data-path": slug } }))),
  );
}

/** Un camino en tinta de grabado: halo de papel, doble línea y marcas transversales. */
function ink(slug, branchSlug) {
  const d = smoothPath(PATH_LINES[slug]);
  return svg("g", {
    className: "ink", attrs: { "data-path": slug, "data-branch": branchSlug, mask: `url(#reveal-${slug})`, style: `--c:${BRANCH_COLORS[branchSlug]}` },
  },
    svg("path", { className: "ink-halo", attrs: { d } }),
    svg("path", { className: "ink-line", attrs: { d, id: `curve-${slug}` } }),
    svg("path", { className: "ink-core", attrs: { d } }),
    svg("path", { className: "ink-ticks", attrs: { d } }));
}

/** Etiqueta de zona: nombre de la rama, cuántos ejercicios tiene y una línea guía hacia la rama. */
function zone(branch, count) {
  const z = ZONES[branch.slug];
  if (!z) return null;
  const [lx, ly] = z.label;
  const [ax, ay] = z.anchor;
  const isTrunk = branch.slug === "tronco";
  return svg("g", {
    className: "zone", attrs: { "data-branch": branch.slug, tabindex: "0", role: "button", "aria-label": `Rama ${branch.name}: ${count} ejercicios`, style: `--c:${BRANCH_COLORS[branch.slug]}` },
  },
    isTrunk ? "" : svg("path", { className: "zone-lead", attrs: { d: `M ${lx} ${ly} L ${ax} ${ay}`, pathLength: 1 } }),
    isTrunk ? "" : svg("g", { attrs: { transform: `translate(${ax} ${ay})` } }, svg("g", { className: "inv" },
      svg("circle", { className: "zone-dot", attrs: { r: 4.5 } }))),
    svg("g", { attrs: { transform: `translate(${lx} ${ly})` } }, svg("g", { className: "inv" },
      svg("text", { className: "zone-name", attrs: { "text-anchor": "middle", y: -2 } }, branch.name),
      svg("text", { className: "zone-count", attrs: { "text-anchor": "middle", y: 15 } }, `${count} ejercicios`))));
}

/** Medallón de grabado: papel con borde de tinta y el color de la rama al centro. La cima lleva un anillo punteado. */
function medallion(node) {
  const label = `${node.name}. ${node.branch.name}, ${node.path.name}, paso ${node.step}${node.isSummit ? ", cima del camino" : ""}`;
  const r = node.isSummit ? 9 : 6.5;
  return svg("g", {
    className: `tnode${node.isSummit ? " is-summit" : ""}`,
    attrs: {
      tabindex: "-1", role: "button", "aria-label": label,
      "data-slug": node.slug, "data-branch": node.branch.slug, "data-path": node.path.slug,
      style: `--c:${BRANCH_COLORS[node.branch.slug] ?? "#555"}`,
    },
  }, svg("g", { className: "inv" },
    svg("circle", { className: "m-hit", attrs: { r: 16 } }), // área de toque más grande que el dibujo
    node.isSummit ? svg("circle", { className: "m-ring", attrs: { r: r + 4 } }) : "",
    svg("circle", { className: "m-out", attrs: { r } }),
    svg("circle", { className: "m-in", attrs: { r: r * 0.52 } }),
    svg("text", { className: "tnode-label", attrs: { y: -(r + 9), "text-anchor": "middle" } }, node.name)));
}

/* --------------------------------------------------------------------------
   Escena
   -------------------------------------------------------------------------- */
/**
 * Dibuja la escena dentro del <svg> y ubica cada nodo sobre su curva (node.x, node.y).
 * Las curvas tienen que estar en el documento para poder medirlas, por eso se ubica al final.
 */
export function renderScene(root, tree, nodes) {
  const pathBranch = {};
  for (const branch of tree) for (const path of branch.paths) pathBranch[path.slug] = branch.slug;
  const paths = [...new Set(nodes.map((node) => node.path.slug))];
  const counts = Object.fromEntries(tree.map((branch) => [branch.slug, nodes.filter((n) => n.branch.slug === branch.slug).length]));

  const roots = svg("a", { className: "troots", attrs: { href: ROOTS.href, "aria-label": `${ROOTS.label}: ir a la página de historia` } },
    svg("g", { attrs: { transform: `translate(${ROOTS.x} ${ROOTS.y})` } }, svg("g", { className: "inv" },
      svg("circle", { attrs: { r: 5 } }),
      svg("text", { attrs: { y: 22, "text-anchor": "middle" } }, ROOTS.label))));

  root.replaceChildren(
    defs(paths),
    svg("rect", { className: "dim", attrs: { ...BIG, mask: "url(#dim-mask)" } }),
    svg("g", { className: "inks" }, ...paths.map((slug) => ink(slug, pathBranch[slug]))),
    svg("g", { className: "saps", attrs: { id: "saps" } }),
    svg("g", { className: "zones" }, ...tree.map((branch) => zone(branch, counts[branch.slug])).filter(Boolean)),
    roots,
    svg("g", { className: "tnodes" }, ...nodes.map(medallion)),
  );

  // Cada ejercicio se ubica a su fracción t del largo de la curva (medida sobre la curva real)
  const groups = Object.fromEntries([...root.querySelectorAll(".tnode")].map((g) => [g.dataset.slug, g]));
  for (const node of nodes) {
    const curve = root.querySelector(`#curve-${node.path.slug}`);
    const point = curve.getPointAtLength(node.t * curve.getTotalLength());
    node.x = point.x;
    node.y = point.y;
    groups[node.slug].setAttribute("transform", `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
  }
}

/* --------------------------------------------------------------------------
   Tinta (al pasar el cursor o elegir una rama)
   -------------------------------------------------------------------------- */
/**
 * Muestra la tinta de un conjunto de caminos: los que no estaban se "dibujan" desde el tronco,
 * los que ya no corresponden se borran. Se anima la máscara de cada camino (strokeDashoffset).
 */
export function showInk(root, slugs, { strong = [] } = {}) {
  const wanted = new Set(slugs);
  root.querySelectorAll(".ink").forEach((g) => {
    const slug = g.dataset.path;
    const on = wanted.has(slug);
    g.classList.toggle("is-on", on);
    g.classList.toggle("is-strong", strong.includes(slug));
    const stroke = root.querySelector(`#reveal-${CSS.escape(slug)} .reveal-stroke`);
    if (on === (g.dataset.shown === "1")) return; // ya está como debe
    g.dataset.shown = on ? "1" : "0";
    gsap.killTweensOf(stroke);
    if (reduceMotion) gsap.set(stroke, { strokeDashoffset: on ? 0 : 1 });
    else if (on) gsap.fromTo(stroke, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.out" });
    else gsap.to(stroke, { strokeDashoffset: 1, duration: 0.35, ease: "power1.in" });
  });
}

/* --------------------------------------------------------------------------
   Savia (al abrir un ejercicio)
   -------------------------------------------------------------------------- */
let sapTween;

/** Borra la savia que haya en pantalla. */
export function clearSap(root) {
  sapTween?.kill();
  root.querySelector("#saps").replaceChildren();
}

/**
 * Hace subir la savia por el camino del nodo, desde el tronco hasta el ejercicio.
 * unit = cuántas unidades de escena mide un píxel de pantalla en el zoom final: con eso la
 * franja queda del mismo grosor en pantalla (gruesa en el tronco, fina en la punta).
 */
export function growSap(root, node, unit) {
  clearSap(root);
  const curve = root.querySelector(`#curve-${node.path.slug}`);
  const total = curve.getTotalLength();
  const end = node.t * total;
  const width = (u) => (5.5 * (1 - u) + 1.6 * u) * unit; // medio ancho, en unidades de escena

  // Contorno de la franja: puntos a cada lado de la curva, separados según su normal
  const samples = 48;
  const left = [];
  const right = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const p = curve.getPointAtLength(u * end);
    const q = curve.getPointAtLength(Math.min(end, u * end + 1));
    const o = curve.getPointAtLength(Math.max(0, u * end - 1));
    const len = Math.hypot(q.x - o.x, q.y - o.y) || 1;
    const nx = -(q.y - o.y) / len;
    const ny = (q.x - o.x) / len;
    const w = width(u);
    left.push(`${(p.x + nx * w).toFixed(1)},${(p.y + ny * w).toFixed(1)}`);
    right.push(`${(p.x - nx * w).toFixed(1)},${(p.y - ny * w).toFixed(1)}`);
  }
  const points = [...left, ...right.reverse()].join(" ");

  // La franja aparece de a poco con una máscara que avanza por la misma curva
  const maskStroke = svg("path", { attrs: { d: curve.getAttribute("d"), pathLength: 1, fill: "none", stroke: "white", "stroke-width": 24 * unit,"stroke-dasharray": "1 1", "stroke-dashoffset": 1 } });
  const color = BRANCH_COLORS[node.branch.slug];
  const spark = svg("circle", { className: "sap-spark", attrs: { r: 3.4 * unit, filter: "url(#sap-glow)" } });
  const group = svg("g", { className: "sap" },
    svg("mask", { attrs: { id: "sap-mask", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 2000, height: 1200 } }, maskStroke),
    svg("g", { attrs: { mask: "url(#sap-mask)" } },
      svg("polygon", { className: "sap-under", attrs: { points, fill: color } }),
      svg("polygon", { className: "sap-body", attrs: { points, filter: "url(#sap-glow)" } })),
    spark);
  root.querySelector("#saps").append(group);

  const state = { p: 0 };
  const draw = () => {
    maskStroke.setAttribute("stroke-dashoffset", String(1 - state.p * node.t));
    const tip = curve.getPointAtLength(state.p * end);
    spark.setAttribute("cx", tip.x.toFixed(1));
    spark.setAttribute("cy", tip.y.toFixed(1));
  };
  if (reduceMotion) {
    state.p = 1;
    draw();
    return;
  }
  draw();
  sapTween = gsap.to(state, { p: 1, duration: 0.8 + node.t * 0.7, ease: "power2.inOut", onUpdate: draw });
}

/* --------------------------------------------------------------------------
   Foco
   -------------------------------------------------------------------------- */
/** Enciende el foco sobre un conjunto de nodos (o lo apaga si la lista está vacía). */
export function setSpotlight(root, nodes) {
  root.querySelector("#spot").replaceChildren(
    ...nodes.map((node) => svg("circle", { attrs: { cx: node.x.toFixed(1), cy: node.y.toFixed(1), r: 95, fill: "black" } })));
  root.classList.toggle("has-focus", nodes.length > 0);
}
