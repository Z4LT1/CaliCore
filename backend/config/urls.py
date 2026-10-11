"""
Enrutador principal: asocia cada URL con la vista (o el archivo urls.py de una app) que la atiende.

Mapa de la API:
    /admin/                      panel de administración de Django
    /api/health/                 comprobación de que el servidor está vivo
    /api/auth/...                registro, login, logout, perfil     (apps/accounts)
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(request):
    """Responde {"status": "ok"}. Sirve para probar que el backend corre (y para el hosting, más adelante)."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/auth/", include("apps.accounts.urls")),
]
