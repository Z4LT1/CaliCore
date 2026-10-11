/**
 * Punto de entrada del frontend. Solo arranca cada feature; la lógica vive dentro de cada una.
 *
 * Estructura:
 *   core/       piezas genéricas sin lógica de calistenia (config, API, sesión, DOM, eventos)
 *   features/   una carpeta por parte de la página, cada una con:
 *                 *.api.js   peticiones al servidor (sin DOM)
 *                 *.view.js  datos -> nodos del DOM (sin peticiones ni listeners)
 *                 index.js   une las dos capas y escucha eventos; exporta init<Feature>()
 *
 * Las features no se importan entre sí: se comunican con eventos (ver core/events.js).
 * Para agregar una sección nueva: crea features/<nombre>/, exporta su init y llámalo aquí.
 */
import { initAuth } from "./features/auth/index.js";
import { initCatalog } from "./features/catalog/index.js";
import { initProgress } from "./features/progress/index.js";

// El orden no afecta: cada init registra sus listeners de inmediato y las peticiones al servidor
// responden después, así que ninguna feature se pierde un evento (por ejemplo, CATALOG_LOADED).
initAuth();
initProgress();
initCatalog();
