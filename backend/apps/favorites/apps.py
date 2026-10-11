from django.apps import AppConfig


class FavoritesConfig(AppConfig):
    """Ejercicios guardados por cada usuario (la estrella de la biblioteca)."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.favorites"
    verbose_name = "Favoritos"
