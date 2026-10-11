"""
Configuración principal de Django para CaliCore.

Django lee este archivo al arrancar. Aquí se decide qué apps están activas, qué base de datos
se usa, cómo se autentican los usuarios, qué orígenes pueden llamar a la API, etc.

Regla de oro: los secretos y lo que cambia entre tu computador y producción NO se escriben aquí,
se leen desde variables de entorno (archivo .env, que no se sube a Git).
"""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# BASE_DIR apunta a la carpeta "backend/" (donde vive manage.py).
BASE_DIR = Path(__file__).resolve().parent.parent

# Carga las variables del archivo backend/.env al entorno del proceso (si el archivo existe).
load_dotenv(BASE_DIR / ".env")


def env_list(name, default=""):
    """Lee una variable de entorno con valores separados por coma y la devuelve como lista."""
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


# ---------------------------------------------------------------------------
# SEGURIDAD BÁSICA
# ---------------------------------------------------------------------------

# DEBUG=True muestra páginas de error detalladas: útil al desarrollar, peligroso en producción.
# Por seguridad el valor por defecto es False: solo se activa si lo pides en .env.
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

SECRET_KEY = os.environ.get("SECRET_KEY", "")
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "Falta la variable SECRET_KEY. Copia backend/.env.example como backend/.env "
        "(copy .env.example .env en Windows) y vuelve a intentarlo."
    )
# Evita desplegar por accidente con la clave de ejemplo.
if not DEBUG and SECRET_KEY.startswith("dev-only"):
    raise ImproperlyConfigured("Estás usando la SECRET_KEY de ejemplo con DEBUG=False. Genera una clave real.")

# Dominios que Django acepta en la cabecera Host (protege contra ataques de "Host header").
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "127.0.0.1,localhost")


# ---------------------------------------------------------------------------
# APLICACIONES INSTALADAS
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    # Apps que trae Django (admin, autenticación, sesiones, etc.)
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Librerías de terceros
    "rest_framework",            # API REST
    "rest_framework.authtoken",  # autenticación por token (crea la tabla de tokens)
    "corsheaders",               # CORS
    # Apps propias de CaliCore (viven en la carpeta apps/)
    "apps.accounts",
    "apps.exercises",
]

# El middleware son "capas" por las que pasa cada petición, en este orden, antes de llegar a tu vista.
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # debe ir ANTES de CommonMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"  # archivo donde empieza el enrutamiento de URLs
WSGI_APPLICATION = "config.wsgi.application"

# Plantillas HTML. La API no las usa, pero el panel /admin/ sí las necesita.
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ---------------------------------------------------------------------------
# BASE DE DATOS
# ---------------------------------------------------------------------------
# Si defines DB_NAME en .env se usa PostgreSQL; si no, SQLite (un archivo db.sqlite3, cero instalación).
if os.environ.get("DB_NAME"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ["DB_NAME"],
            "USER": os.environ.get("DB_USER", "postgres"),
            "PASSWORD": os.environ.get("DB_PASSWORD", ""),
            "HOST": os.environ.get("DB_HOST", "127.0.0.1"),
            "PORT": os.environ.get("DB_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Tipo de clave primaria que Django crea por defecto en los modelos.
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ---------------------------------------------------------------------------
# CONTRASEÑAS
# ---------------------------------------------------------------------------
# Django guarda las contraseñas hasheadas (nunca en texto plano). Estos validadores rechazan las débiles.
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ---------------------------------------------------------------------------
# IDIOMA Y ZONA HORARIA
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "es-cl"          # mensajes de error de Django en español
TIME_ZONE = "America/Santiago"
USE_I18N = True
USE_TZ = True                    # guarda fechas con zona horaria (buena práctica)

STATIC_URL = "static/"


# ---------------------------------------------------------------------------
# API REST (Django REST Framework)
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    # Cómo se identifica al usuario: cabecera "Authorization: Token <token>".
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    # "Seguro por defecto": toda vista exige estar autenticada, salvo que una vista diga lo contrario
    # (el catálogo de ejercicios, el registro y el login son públicos de forma explícita).
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # Límites de peticiones para frenar abusos y fuerza bruta.
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "300/hour",   # visitantes sin sesión
        "user": "3000/hour",  # usuarios con sesión
        "auth": "20/min",     # login y registro (más estricto, ver apps/accounts/views.py)
    },
    # Las listas largas se devuelven por páginas de 50 elementos: {"count", "next", "previous", "results"}.
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}


# ---------------------------------------------------------------------------
# CORS: qué sitios web pueden llamar a esta API desde el navegador
# ---------------------------------------------------------------------------
# El navegador bloquea por defecto que una página en localhost:5500 (frontend) lea respuestas de
# localhost:8000 (backend), porque son "orígenes" distintos. Aquí autorizamos solo al frontend.
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500"
)
