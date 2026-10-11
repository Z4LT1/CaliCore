/**
 * Configuración de Vite: el servidor de desarrollo y el empaquetador del frontend.
 *
 * - En desarrollo (`npm run dev`) sirve la carpeta frontend/ y recarga el navegador al guardar.
 *   Reemplaza a Live Server.
 * - Al publicar (`npm run build`) une y optimiza HTML, CSS, JS y librerías en la carpeta dist/.
 */
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    // Mismo puerto que usaba Live Server: el backend ya autoriza este origen en CORS_ALLOWED_ORIGINS.
    port: 5500,
    // Si el puerto está ocupado, fallar en vez de usar otro (con otro puerto, CORS bloquearía la API).
    strictPort: true,
  },
  build: {
    // Sitio con varias páginas: cada HTML es una entrada. Al crear una página nueva, se agrega aquí.
    rolldownOptions: {
      input: {
        inicio: resolve(import.meta.dirname, "index.html"),
        arbol: resolve(import.meta.dirname, "arbol.html"),
      },
    },
  },
});
