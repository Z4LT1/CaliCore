"""Un favorito es la relación "este usuario guardó este ejercicio"."""
from django.conf import settings
from django.db import models


class Favorite(models.Model):
    # CASCADE: si se borra el usuario o el ejercicio, su favorito ya no tiene sentido y se borra también
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    exercise = models.ForeignKey("exercises.Exercise", on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]  # los guardados más recientes primero
        verbose_name = "favorito"
        constraints = [
            # Un usuario no puede guardar dos veces el mismo ejercicio (lo garantiza la base de datos)
            models.UniqueConstraint(fields=["user", "exercise"], name="unique_favorite_per_user"),
        ]

    def __str__(self):
        return f"{self.user} ★ {self.exercise}"
