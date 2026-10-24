/**
 * Vista del árbol: arma la escena SVG con las capas de la ilustración. No maneja el zoom ni los
 * eventos (eso lo hace index.js); solo dibuja.
 *
 * Todo se dibuja en píxeles de la escena (2000 × 1200, ver layout.js) dentro del grupo
 * "cámara"; index.js mueve y escala ese grupo. Así la ilustración nunca se deforma: solo se
 * acerca o se aleja manteniendo su proporción.
 *
 * Capas, de atrás hacia adelante:
 *   1. el fondo (cielo, sol, montañas)
 *   2. el árbol solo, con un recorte que "crece" desde la base al cargar
 *   3. un velo oscuro con un "foco": ilumina la rama elegida y oscurece el resto
 *   4. las venas: líneas finas que siguen cada camino sobre las ramas dibujadas
 *   5. la savia: partículas de luz que suben por las venas
 *   6. las raíces (enlace a la historia) y los ejercicios
 *
 * Los ejercicios y las raíces son como los alfileres de un mapa: mantienen su tamaño en
 * pantalla aunque cambie el zoom. Para eso su contenido va en un grupo "-body" que el CSS
 * contraescala con la variable --inv (= 1 / zoom), que actualiza index.js.
 */
import { svg } from "../../core/dom.js";
import { BRANCH_COLORS, PATH_LINES, ROOTS, SCENE } from "./layout.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const linePath = (points) => `M ${points.map(([x, y]) => `${x} ${y}`).join(" L ")}`;
const SPOT_RADIUS = 110; // radio del foco de luz, en píxeles de la escena
const size = { x: 0, y: 0, width: SCENE.width, height: SCENE.height };

function defs() {
  return svg("defs", {},
    // Recorte que crece de abajo hacia arriba (animado en CSS): el árbol "nace" desde las raíces
    svg("clipPath", { attrs: { id: "grow-clip" } },
      svg("rect", { className: "grow-rect", attrs: size })),
    // Máscara del velo: blanco = se oscurece; las manchas negras (desenfocadas) son el foco
    svg("filter", { attrs: { id: "spot-blur", x: "-50%", y: "-50%", width: "200%", height: "200%" } },
      svg("feGaussianBlur", { attrs: { stdDeviation: 40 } })),
    svg("mask", { attrs: { id: "dim-mask", maskUnits: "userSpaceOnUse", ...size } },
      svg("rect", { attrs: { fill: "white", ...size } }),
      svg("g", { attrs: { id: "spot", filter: "url(#spot-blur)" } })),
  );
}

function drawNode(node) {
  const color = BRANCH_COLORS[node.branch.slug] ?? "#555";
  const label = `${node.name}. ${node.branch.name}, ${node.path.name}, paso ${node.step}${node.isSummit ? ", cima" : ""}`;
  const group = svg("g", {
    className: `tnode${node.isSummit ? " is-summit" : ""}`,
    attrs: {
      tabindex: "0", role: "button", "aria-label": label,
      "data-slug": node.slug, "data-branch": node.branch.slug, "data-path": node.path.slug,
      transform: `translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})`,
      // Retraso de aparición: los nodos de abajo brotan primero, siguiendo al recorte que crece
      style: `--c:${color}; --d:${(0.9 + (1 - node.y / SCENE.height) * 1.6).toFixed(2)}s`,
    },
  });
  const r = node.isSummit ? 8 : 5.5;
  group.append(svg("g", { className: "tnode-body" },
    svg("circle", { className: "tnode-halo", attrs: { r: r + 5 } }),
    svg("circle", { className: "tnode-dot", attrs: { r } }),
    svg("text", { className: "tnode-label", text: node.name, attrs: { y: -(r + 7), "text-anchor": "middle" } }),
  ));
  return group;
}

/** Partículas de savia: cada una recorre su vena con <animateMotion> (animación nativa de SVG). */
function sap(pathSlug, points) {
  if (reduceMotion) return [];
  const length = points.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - points[i][0], y - points[i][1]), 0);
  const duration = Math.max(length / 120, 3); // unos 120 píxeles (de la escena) por segundo
  return [0, 0.5].map((offset) => svg("circle", { className: "sap", attrs: { r: 4 } },
    svg("animateMotion", { attrs: { dur: `${duration.toFixed(1)}s`, repeatCount: "indefinite", begin: `${(2.6 + offset * duration).toFixed(1)}s` } },
      svg("mpath", { attrs: { href: `#vein-${pathSlug}` } }))));
}

/** Dibuja la escena dentro del <svg>. Devuelve el grupo "cámara" que index.js mueve con el zoom. */
export function renderScene(root, nodes) {
  const usedPaths = [...new Set(nodes.map((node) => node.path.slug))];
  const veins = usedPaths.map((slug) => svg("path", {
    className: "vein", attrs: {
      id: `vein-${slug}`, "data-path": slug, d: linePath(PATH_LINES[slug]),
      "vector-effect": "non-scaling-stroke", // el grosor de la línea no cambia con el zoom
      style: `--c:${BRANCH_COLORS[nodes.find((n) => n.path.slug === slug).branch.slug]}`,
    },
  }));

  const roots = svg("a", {
    className: "troots",
    attrs: { href: ROOTS.href, "aria-label": `${ROOTS.label}: ir a la página de historia`, transform: `translate(${ROOTS.x} ${ROOTS.y})` },
  }, svg("g", { className: "troots-body" },
    svg("circle", { attrs: { r: 9 } }),
    svg("text", { text: ROOTS.label, attrs: { y: 26, "text-anchor": "middle" } })));

  const layers = SCENE.layers.map((layer) => {
    const image = svg("image", { attrs: { href: layer.url, ...size } });
    // Solo el árbol crece al cargar; el paisaje ya está ahí
    return svg("g", { className: `tlayer tlayer-${layer.id}`, attrs: layer.id === "arbol" ? { "clip-path": "url(#grow-clip)" } : {} }, image);
  });

  const camera = svg("g", { attrs: { id: "tree-camera" } },
    ...layers,
    svg("rect", { className: "dim", attrs: { mask: "url(#dim-mask)", ...size } }),
    svg("g", { className: "veins" }, ...veins),
    svg("g", { className: "saps" }, ...usedPaths.flatMap((slug) => sap(slug, PATH_LINES[slug]))),
    roots,
    svg("g", { className: "tnodes" }, ...nodes.map(drawNode)),
  );

  root.replaceChildren(defs(), camera);
  return camera;
}

/** Ajusta el SVG al tamaño del escenario: 1 unidad del SVG = 1 píxel de pantalla. */
export function fitScene(root, width, height) {
  root.setAttribute("viewBox", `0 0 ${width} ${height}`);
}

/** Enciende el foco sobre un conjunto de nodos (o lo apaga si la lista está vacía). */
export function setSpotlight(root, nodes) {
  const spot = root.querySelector("#spot");
  spot.replaceChildren(...nodes.map((node) => svg("circle", { attrs: { cx: node.x, cy: node.y, r: SPOT_RADIUS, fill: "black" } })));
  root.classList.toggle("has-focus", nodes.length > 0);
}
