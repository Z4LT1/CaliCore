from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Configuración de la app. 'name' es la ruta Python completa (porque vive dentro de apps/)."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
