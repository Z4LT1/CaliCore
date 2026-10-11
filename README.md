# CaliCore

Plataforma web de calistenia: un catálogo de ejercicios organizado en **progresiones** (cadenas que van del ejercicio más accesible al más exigente, por ejemplo hasta el planche) y un **registro de entrenamientos** por usuario.

Es un proyecto fullstack de portafolio. Está pensado para leerse y entenderse archivo por archivo, por eso casi todo el código está comentado en español.

**Estado actual**

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Frontend estático (HTML, CSS y JavaScript sin librerías) | Hecho |
| 2 | Backend (Django, Django REST Framework, autenticación por token, SQLite) | Hecho |
| 3 | Frontend en React + Vite consumiendo la misma API | Pendiente |
| 4 | PostgreSQL y despliegue público | Pendiente |
| 5 | Documento de seguridad (OWASP), pruebas automáticas en GitHub Actions | Pendiente |

---

## 1. Cómo funciona

```
┌──────────────────────┐   peticiones HTTP con JSON    ┌───────────────────────────┐
│  FRONTEND (navegador)│ ───────────────────────────►  │  BACKEND (Django + DRF)   │
│  HTML + CSS + JS     │   Authorization: Token ...    │  API REST en /api/...     │
│  carpeta frontend/   │ ◄───────────────────────────  │  carpeta backend/         │
│  puerto 5500         │   respuestas en JSON          │  puerto 8000              │
└──────────────────────┘                               └─────────────┬─────────────┘
                                                                     │ ORM de Django
                                                                     ▼
                                                        ┌───────────────────────────┐
                                                        │ Base de datos             │
                                                        │ SQLite (ahora)            │
                                                        │ PostgreSQL (fase 4)       │
                                                        └───────────────────────────┘
```

Son **dos aplicaciones separadas** que solo se comunican por HTTP. Eso es lo que permite que en la fase 3 se reemplace el frontend por React sin tocar el backend.

### Qué pasa cuando usas la página

1. **Cargas la página.** `main.js` pide `GET /api/exercises/` (público). Django consulta la base de datos, convierte cada ejercicio a JSON y responde. El frontend agrupa los ejercicios por progresión y dibuja las escaleras.
2. **Te registras o ingresas.** El frontend envía usuario y contraseña a `/api/auth/register/` o `/api/auth/login/`. Django valida, y responde con un **token** (una cadena larga y aleatoria). El frontend lo guarda en `localStorage`.
3. **Guardas un entrenamiento.** El frontend hace `POST /api/workouts/` enviando el token en la cabecera `Authorization: Token <token>`. Django busca a qué usuario pertenece ese token, valida los datos y guarda el registro a nombre de ese usuario.
4. **Ves tu historial.** `GET /api/workouts/` devuelve solo los registros del usuario del token. Nunca los de otros.
5. **Sales.** `POST /api/auth/logout/` borra el token en el servidor, así que deja de servir aunque alguien lo hubiera copiado.

---

## 2. Estructura del proyecto

```
CaliCore/
├── README.md                    ← este archivo
├── .gitignore                   ← qué archivos Git no debe subir
│
├── backend/                     ← servidor y API (Python)
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/                  ← configuración global del proyecto Django
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   └── apps/                    ← la lógica, dividida en tres apps
│       ├── __init__.py
│       ├── accounts/            ← registro, login, logout, perfil
│       │   ├── __init__.py
│       │   ├── apps.py
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── tests.py
│       ├── exercises/           ← catálogo de ejercicios y progresiones
│       │   ├── __init__.py
│       │   ├── apps.py
│       │   ├── models.py
│       │   ├── admin.py
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   ├── tests.py
│       │   ├── migrations/
│       │   │   ├── __init__.py
│       │   │   └── 0001_initial.py
│       │   └── management/commands/
│       │       ├── __init__.py   (y management/__init__.py)
│       │       └── seed_exercises.py
│       └── workouts/            ← registro de entrenamientos del usuario
│           ├── __init__.py
│           ├── apps.py
│           ├── models.py
│           ├── admin.py
│           ├── serializers.py
│           ├── views.py
│           ├── urls.py
│           ├── tests.py
│           └── migrations/
│               ├── __init__.py
│               └── 0001_initial.py
│
└── frontend/                    ← lo que ve el usuario (HTML, CSS, JS)
    ├── index.html
    ├── css/
    │   └── styles.css
    ├── js/
    │   ├── config.js
    │   ├── session.js
    │   ├── api.js
    │   ├── dom.js
    │   ├── auth.js
    │   ├── exercises.js
    │   ├── workouts.js
    │   └── main.js
    └── assets/img/.gitkeep
```

---

## 3. Qué hace cada archivo

### Raíz

| Archivo | Para qué sirve |
|---|---|
| `README.md` | Documentación del proyecto. Es lo primero que ve quien abre el repositorio en GitHub. |
| `.gitignore` | Lista de archivos que Git ignora: el entorno virtual `.venv/`, la base de datos local `db.sqlite3`, el archivo de secretos `.env`, cachés de Python, configuración del editor. |

### `backend/` (archivos de la raíz del backend)

| Archivo | Para qué sirve |
|---|---|
| `manage.py` | Herramienta de línea de comandos de Django. Con ella ejecutas el servidor, las migraciones, las pruebas y los comandos propios (`python manage.py runserver`, `migrate`, `test`, `seed_exercises`…). |
| `requirements.txt` | Lista de librerías Python necesarias. Se instalan con `pip install -r requirements.txt`. |
| `.env.example` | Plantilla de las variables de entorno (clave secreta, modo debug, hosts permitidos, orígenes CORS, datos de PostgreSQL). Se copia como `.env`, que sí lleva los valores reales y nunca se sube a Git. |
| `db.sqlite3` | *(Se crea al ejecutar `migrate`.)* La base de datos local: un solo archivo. No se sube a Git. |

### `backend/config/` (configuración global)

| Archivo | Para qué sirve |
|---|---|
| `settings.py` | El archivo de configuración principal. Define las apps instaladas, el middleware, la base de datos, los validadores de contraseña, el idioma, la configuración de la API (autenticación por token, permisos, límites de peticiones, paginación) y CORS. Lee los secretos desde `.env`. Falla con un mensaje claro si falta `SECRET_KEY`. |
| `urls.py` | El enrutador principal. Decide qué parte del código atiende cada URL y delega en el `urls.py` de cada app. También define `/api/health/`. |
| `wsgi.py` | Puerta de entrada para servidores de producción (gunicorn y similares). En desarrollo no la usas. |
| `asgi.py` | Equivalente asíncrono de WSGI. Django la genera por defecto, aún no se usa. |
| `__init__.py` | Archivo vacío que le indica a Python que la carpeta es un paquete importable. |

### `backend/apps/accounts/` (cuentas de usuario)

No define modelos propios: usa el modelo de usuario que trae Django.

| Archivo | Para qué sirve |
|---|---|
| `apps.py` | Registra la app en Django con su nombre completo (`apps.accounts`). |
| `serializers.py` | `RegisterSerializer`: valida usuario, correo (opcional) y contraseña (aplica los validadores de settings.py) y crea el usuario con la contraseña hasheada. La contraseña es `write_only`: nunca se devuelve. |
| `views.py` | Cuatro vistas. `RegisterView` crea la cuenta y devuelve un token. `LoginView` valida credenciales y devuelve un token. `LogoutView` borra el token. `MeView` devuelve los datos del usuario autenticado. Login y registro tienen un límite de 20 peticiones por minuto contra fuerza bruta. |
| `urls.py` | Rutas: `register/`, `login/`, `logout/`, `me/` (montadas bajo `/api/auth/`). |
| `tests.py` | 7 pruebas: registro, contraseña débil rechazada, contraseña guardada hasheada, login correcto e incorrecto, token viejo ignorado en login, `me` protegido, logout invalida el token. |

### `backend/apps/exercises/` (catálogo)

| Archivo | Para qué sirve |
|---|---|
| `models.py` | Modelo `Exercise`: nombre, slug, categoría (push, pull, legs, core, skills), nivel (principiante, intermedio, avanzado), descripción, músculos, y los campos `progression_group` y `progression_step` que forman las cadenas de progresión. |
| `admin.py` | Registra `Exercise` en el panel `/admin/` para crear y editar ejercicios desde el navegador. |
| `serializers.py` | Convierte un `Exercise` a JSON. Añade `category_display` y `level_display` con el texto legible en español. |
| `views.py` | `ExerciseViewSet`: lista y detalle, solo lectura y públicos. La lista acepta los filtros `?category=`, `?level=` y `?search=`. |
| `urls.py` | Crea las rutas `exercises/` y `exercises/<slug>/` con un router. |
| `tests.py` | 6 pruebas: lista pública, filtros, búsqueda, intento de inyección SQL inofensivo, detalle por slug, un token inválido no rompe el catálogo público. |
| `migrations/0001_initial.py` | Instrucciones generadas por Django para crear la tabla `Exercise` en la base de datos. Se aplican con `migrate`. |
| `management/commands/seed_exercises.py` | Comando propio: `python manage.py seed_exercises` carga los 24 ejercicios iniciales. Se puede ejecutar varias veces sin duplicar nada. Aquí editas el catálogo inicial. |

### `backend/apps/workouts/` (entrenamientos)

| Archivo | Para qué sirve |
|---|---|
| `models.py` | Modelo `WorkoutLog`: usuario, ejercicio, fecha, series, repeticiones, segundos y notas. Una relación con `User` y otra con `Exercise`. |
| `admin.py` | Registra `WorkoutLog` en `/admin/`. |
| `serializers.py` | Valida lo que envía el cliente: fecha no futura, series de 1 a 50 y que haya repeticiones o segundos. El campo `user` no aparece: el dueño lo fija el servidor, nunca el cliente. |
| `views.py` | `WorkoutLogViewSet`: CRUD completo más `summary/` (estadísticas). `get_queryset` filtra siempre por el usuario autenticado, y `perform_create` le asigna el dueño. |
| `urls.py` | Rutas `workouts/`, `workouts/<id>/`, `workouts/summary/`. |
| `tests.py` | 9 pruebas: requiere autenticación, el dueño no se puede falsificar desde el cuerpo, un usuario no ve ni borra registros ajenos, validaciones, estadísticas. |
| `migrations/0001_initial.py` | Crea la tabla `WorkoutLog`. |

### `frontend/`

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página completa: cabecera, hero, catálogo con filtros, panel "Mi progreso", diálogo de login y registro (`<dialog>`) y pie. Es HTML semántico: `header`, `nav`, `main`, `section`, `form`, `dialog`, `footer`. |
| `css/styles.css` | Todos los estilos, divididos en 9 secciones numeradas. Usa variables CSS, Flexbox y Grid, y una media query para móvil. |
| `js/config.js` | La URL del backend (`API_URL`) y los nombres de las claves de `localStorage`. Es lo único que cambias al desplegar. |
| `js/session.js` | Guarda, lee y borra el token y el nombre de usuario. Emite el evento `session:changed` cuando la sesión cambia. |
| `js/api.js` | La función `request()`, por la que pasan todas las llamadas al backend: pone la URL base, el token y el JSON, y convierte los errores de la API en mensajes legibles. Si recibe un 401 con un token guardado, cierra la sesión local. |
| `js/dom.js` | La función `el()` para crear elementos del DOM usando `textContent`. Es la defensa contra XSS: nunca se usa `innerHTML` con datos del servidor. |
| `js/auth.js` | `login`, `register` y `logout`. |
| `js/exercises.js` | Pide el catálogo con filtros y lo dibuja agrupado en cadenas de progresión (escaleras) y ejercicios sueltos. |
| `js/workouts.js` | Pide, crea y borra registros, rellena el selector de ejercicios y dibuja el historial y las estadísticas. |
| `js/main.js` | El punto de entrada: conecta los formularios y botones del HTML con los demás módulos, y muestra u oculta partes de la página según haya sesión. |
| `assets/img/.gitkeep` | Archivo vacío. Git no guarda carpetas vacías; este archivo hace que `assets/img/` exista en el repositorio. |

---

## 4. Puesta en marcha (Windows, terminal `cmd` de VS Code)

### Backend

```bat
cd backend
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed_exercises
python manage.py createsuperuser
python manage.py runserver
```

Qué hace cada paso:

1. `py -m venv .venv` crea un **entorno virtual**: una carpeta aislada donde se instalan las librerías de este proyecto sin mezclarlas con otros.
2. `.venv\Scripts\activate` lo activa. Verás `(.venv)` al inicio de la línea. Hay que activarlo cada vez que abras una terminal nueva.
3. `pip install -r requirements.txt` instala las dependencias.
4. `copy .env.example .env` crea tu archivo de configuración. **Sin este paso el servidor no arranca** (`SECRET_KEY` es obligatoria).
5. `migrate` crea las tablas en `db.sqlite3`.
6. `seed_exercises` carga el catálogo de 24 ejercicios.
7. `createsuperuser` crea tu usuario administrador para entrar a `/admin/`. Es opcional.
8. `runserver` levanta la API en `http://127.0.0.1:8000`.

Comprueba que funciona abriendo `http://127.0.0.1:8000/api/health/` (debe mostrar `{"status": "ok"}`) y `http://127.0.0.1:8000/api/exercises/`.

### Frontend

Abre la carpeta `CaliCore` en VS Code, haz clic derecho sobre `frontend/index.html` y elige **Open with Live Server** (o el botón "Go Live" de la barra inferior). Se abrirá en el puerto 5500.

No abras `index.html` con doble clic: los módulos de JavaScript (`import`/`export`) no funcionan desde `file://`, solo por HTTP.

### Pruebas automáticas

```bat
python manage.py test
```

Ejecuta las 22 pruebas del backend sobre una base de datos temporal. Tardan unos 20 segundos porque el hasheo de contraseñas de Django es lento a propósito (es una medida de seguridad).

### Panel de administración

`http://127.0.0.1:8000/admin/`, con el superusuario que creaste. Desde ahí puedes crear, editar y borrar ejercicios y ver los registros de los usuarios.

---

## 5. La API

Base: `http://127.0.0.1:8000/api`

| Método | Ruta | ¿Requiere sesión? | Qué hace |
|---|---|---|---|
| GET | `/health/` | No | Comprueba que el servidor está vivo. |
| POST | `/auth/register/` | No | Crea la cuenta. Cuerpo: `{username, password, email?}`. Devuelve `{token, username}`. |
| POST | `/auth/login/` | No | Cuerpo: `{username, password}`. Devuelve `{token, username}`. |
| POST | `/auth/logout/` | Sí | Borra el token actual. |
| GET | `/auth/me/` | Sí | Devuelve `{username, email}`. |
| GET | `/exercises/` | No | Lista de ejercicios. Filtros: `?category=push`, `?level=advanced`, `?search=dominada`. Devuelve una lista simple, sin paginar. |
| GET | `/exercises/<slug>/` | No | Detalle de un ejercicio. |
| GET | `/workouts/` | Sí | Tus registros, paginados: `{count, next, previous, results}`. |
| POST | `/workouts/` | Sí | Crea un registro: `{exercise, sets, reps?, seconds?, performed_on?, notes?}`. |
| GET / PUT / PATCH / DELETE | `/workouts/<id>/` | Sí | Ver, editar o borrar un registro **propio**. Si es de otro usuario responde 404. |
| GET | `/workouts/summary/` | Sí | Totales y actividad de los últimos 7 días. |

Cabecera de autenticación: `Authorization: Token <tu_token>`.

Prueba rápida desde la terminal:

```bat
curl http://127.0.0.1:8000/api/exercises/?category=skills
```

### Códigos de respuesta que verás

| Código | Significado |
|---|---|
| 200 / 201 / 204 | Correcto / creado / correcto sin contenido (tras borrar). |
| 400 | Datos inválidos. El cuerpo explica qué campo falló. |
| 401 | Falta el token o no es válido. |
| 404 | No existe, o no es tuyo. |
| 429 | Demasiadas peticiones (límite de frecuencia). |

---

## 6. Modelo de datos

```
┌─────────────┐        ┌───────────────────────┐        ┌──────────────────────────┐
│ User        │ 1    * │ WorkoutLog            │ *    1 │ Exercise                 │
│ (de Django) │────────│ performed_on          │────────│ name, slug               │
│ username    │        │ sets                  │        │ category, level          │
│ password    │        │ reps    ┐ al menos    │        │ description, muscles     │
│ email       │        │ seconds ┘ uno         │        │ progression_group        │
└─────────────┘        │ notes                 │        │ progression_step         │
                       └───────────────────────┘        └──────────────────────────┘
```

Una **progresión** no es una tabla aparte: es el conjunto de ejercicios que comparten el mismo `progression_group` (por ejemplo "Planche"), ordenados por `progression_step`. Es una solución simple para empezar; en una versión posterior puede pasar a ser su propio modelo.

---

## 7. Seguridad

### Qué ya está implementado

| Medida | Dónde |
|---|---|
| Contraseñas hasheadas (PBKDF2) y validadas contra claves débiles o comunes | `settings.py`, `accounts/serializers.py` |
| Autenticación por token y **seguro por defecto**: toda vista exige sesión salvo las públicas, declaradas explícitamente | `settings.py` |
| **Control de acceso por objeto**: cada usuario solo ve y modifica sus propios registros (previene IDOR) | `workouts/views.py` |
| **Mass assignment evitado**: el dueño del registro lo fija el servidor, no el cliente | `workouts/serializers.py`, `views.py` |
| Validación en el servidor de todo dato (rangos, fechas, campos cruzados). La validación del navegador es solo comodidad | `workouts/serializers.py` |
| Consultas parametrizadas por el ORM: no hay inyección SQL | `exercises/views.py` (con prueba incluida) |
| Límite de peticiones, con uno estricto para login y registro (fuerza bruta) | `settings.py`, `accounts/views.py` |
| CORS con lista de orígenes permitidos, no abierto a todos | `settings.py` |
| Secretos fuera del código (`.env`), `DEBUG` apagado por defecto, y rechazo de la clave de ejemplo en producción | `settings.py` |
| Defensa contra XSS: todo dato del servidor se pinta con `textContent`, nunca con `innerHTML` | `frontend/js/dom.js` |
| Logout que invalida el token en el servidor | `accounts/views.py` |

### Limitaciones conocidas (a mejorar)

- El token se guarda en `localStorage`, legible por cualquier script de la página. Si hubiera un XSS, podría robarse. La alternativa más robusta son cookies `HttpOnly`.
- Los tokens de DRF **no caducan**. Una mejora es JWT con vencimiento y renovación.
- Registrarse con un usuario existente revela que ese usuario existe (enumeración de usuarios).
- No hay verificación de correo ni recuperación de contraseña.
- En desarrollo se usa HTTP, sin cifrar. En producción debe ser HTTPS, con `SECURE_SSL_REDIRECT`, cookies seguras y HSTS. Se revisa con `python manage.py check --deploy`.
- Falta una Content Security Policy en el frontend.
- `/admin/` está en la ruta por defecto. En producción conviene cambiarla y protegerla.

Estas limitaciones son el material para el futuro `SECURITY.md`, donde se mapeará el proyecto contra el **OWASP Top 10**.

---

## 8. Decisiones de diseño (el "por qué")

- **Django + DRF.** Python y Django ya están en el CV. Django trae autenticación, ORM, panel de administración y defensas contra las vulnerabilidades web más comunes de fábrica. DRF convierte modelos en una API REST con poco código.
- **Frontend y backend separados.** Obliga a entender cómo se comunican (HTTP, JSON, autenticación, CORS) y permite cambiar el frontend por React sin tocar el backend.
- **JavaScript sin librerías primero.** Antes de React hay que dominar el DOM, los eventos y `fetch`. En la fase 3, React reemplaza esa capa y la comparación es directa.
- **Autenticación por token (DRF).** Es lo más simple de entender para una primera versión. Tiene limitaciones (ver sección 7) que se documentan en vez de ocultarse.
- **SQLite ahora, PostgreSQL después.** SQLite no necesita instalar nada. Cambiar a PostgreSQL es solo definir variables en `.env`, porque el ORM abstrae la base de datos.
- **Tres apps en vez de una.** Cada app (`accounts`, `exercises`, `workouts`) tiene una responsabilidad y puede probarse por separado.
- **Pruebas desde el inicio.** Las 22 pruebas verifican sobre todo los permisos y las validaciones, que es donde se cometen los errores de seguridad.

---

## 9. Subirlo a Git

Las carpetas `.venv/`, el archivo `.env` y `db.sqlite3` **no deben subirse**: ya están en el `.gitignore`.

Flujo recomendado, el que vimos para un repositorio nuevo:

1. Crea el repositorio vacío `calicore` en GitHub.
2. `git clone https://github.com/Z4LT1/calicore.git`
3. Copia dentro el contenido de esta carpeta `CaliCore/`.
4. `git status`: comprueba que **no** aparezcan `.env`, `.venv` ni `db.sqlite3`.
5. `git add .`, `git commit -m "Base de CaliCore: frontend estático y backend Django"`, `git push`.

Sí se suben las carpetas `migrations/`: son parte del código.

---

## 10. Hoja de ruta

**Fase 3: React + Vite.** Crear `frontend-react/` con componentes (`ExerciseChain`, `WorkoutForm`, `AuthDialog`), estado con hooks y las mismas llamadas a la API. La versión estática puede quedar como referencia.

**Fase 4: PostgreSQL y despliegue.** Definir `DB_NAME` y compañía en `.env`, instalar `psycopg`, desplegar el backend (Render, Railway u otro) y el frontend (Netlify, Vercel o GitHub Pages), actualizar `CORS_ALLOWED_ORIGINS` y `API_URL`, poner `DEBUG=False` y ejecutar `check --deploy`.

**Fase 5: seguridad y calidad.** Escribir `SECURITY.md` mapeado al OWASP Top 10, automatizar `manage.py test` con GitHub Actions, agregar capturas al README.

**Ideas de funcionalidad**

- Metas por ejercicio: fuerza, hipertrofia, cardio, flexibilidad (la idea original del menú).
- Marcar un peldaño de una progresión como "conseguido" y mostrar cuál es el siguiente.
- Récords personales y gráficos de progreso.
- Rutinas armadas con varios ejercicios.
- Editar registros desde la interfaz (el endpoint `PATCH` ya existe).

---

## 11. Cómo contar este proyecto en una entrevista

- **Qué es:** una aplicación fullstack con una API REST en Django, autenticación por token, base de datos relacional y un frontend que la consume.
- **Una decisión técnica concreta:** el filtrado por usuario en `get_queryset`, que previene que un usuario lea registros ajenos adivinando ids.
- **Una limitación que conozco:** el token en `localStorage` y su plan de mejora. Reconocer una limitación y saber arreglarla pesa más que fingir que no existe.
- **Cómo lo probé:** 22 pruebas automáticas, con foco en permisos y validaciones.
- **Qué haría distinto con más tiempo:** JWT con vencimiento o cookies `HttpOnly`, PostgreSQL y despliegue con HTTPS.

---

## 12. Glosario

| Término | Significado |
|---|---|
| **API REST** | Un servidor que expone datos por URLs y métodos HTTP (GET para leer, POST para crear, PATCH para editar, DELETE para borrar) y responde en JSON. |
| **CRUD** | Create, Read, Update, Delete: las cuatro operaciones básicas sobre los datos. |
| **ORM** | Traduce código Python a consultas SQL. Permite escribir `Exercise.objects.filter(level="beginner")` en vez de SQL a mano. |
| **Modelo** | Una clase Python que representa una tabla de la base de datos. |
| **Migración** | Un archivo que describe un cambio en la estructura de la base de datos. |
| **Serializer** | Convierte objetos a JSON (y viceversa) y valida los datos entrantes. |
| **ViewSet** | Una clase que agrupa las vistas de un mismo recurso (lista, detalle, crear, editar, borrar). |
| **Token** | Cadena aleatoria que identifica una sesión. Se envía en cada petición en vez de la contraseña. |
| **CORS** | Regla del navegador que impide que una página lea respuestas de otro origen (dominio o puerto), salvo que ese servidor lo autorice. |
| **IDOR** | Vulnerabilidad en la que se accede a datos ajenos cambiando un id en la URL. |
| **XSS** | Vulnerabilidad en la que un atacante logra que su código JavaScript se ejecute en la página de otra persona. |
| **Planche** vs **plancha** | *Planche* es la habilidad de calistenia (cuerpo horizontal sostenido solo por las manos). *Plancha abdominal* es el ejercicio isométrico de core, apoyado en antebrazos. |

---

## 13. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `ImproperlyConfigured: Falta la variable SECRET_KEY` | No creaste el `.env`. Ejecuta `copy .env.example .env` dentro de `backend/`. |
| `No module named 'django'` | El entorno virtual no está activo. Ejecuta `.venv\Scripts\activate` y comprueba que veas `(.venv)`. |
| En la página: "No se pudo conectar con el servidor" | El backend no está corriendo, o `API_URL` en `config.js` no coincide con su dirección. |
| En la consola del navegador: error de CORS | Live Server corre en un origen que no está en `CORS_ALLOWED_ORIGINS` (`.env`). Añade el origen exacto (puerto incluido) y reinicia Django. |
| La página queda en blanco o `import` falla | Abriste `index.html` con doble clic. Usa Live Server. |
| `Error: That port is already in use` | Hay otro servidor en el puerto 8000. Usa `python manage.py runserver 8001` y actualiza `API_URL`. |
| Tras cambiar un modelo, error de tabla o columna inexistente | Faltan migraciones: `python manage.py makemigrations` y luego `python manage.py migrate`. |
| Las pruebas tardan | Es normal: el hasheo de contraseñas es lento a propósito. |
