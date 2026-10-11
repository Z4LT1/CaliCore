"""Modelo del registro de entrenamientos: cada fila es "el usuario X hizo el ejercicio Y en tal fecha"."""
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class WorkoutLog(models.Model):
    # ForeignKey = relación "muchos a uno". CASCADE: si se borra el usuario, se borran sus registros.
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workout_logs")
    # PROTECT: no se puede borrar un ejercicio del catálogo si hay registros que lo usan.
    exercise = models.ForeignKey("exercises.Exercise", on_delete=models.PROTECT, related_name="logs")

    performed_on = models.DateField(default=timezone.localdate)  # por defecto, hoy
    sets = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(50)])
    # Un ejercicio se mide por repeticiones (flexiones) o por tiempo (plancha, planche). Basta con uno de los dos.
    reps = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MaxValueValidator(1000)])
    seconds = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MaxValueValidator(3600)])
    notes = models.CharField(max_length=300, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-performed_on", "-created_at"]  # más recientes primero

    def __str__(self):
        return f"{self.user} · {self.exercise} · {self.performed_on}"
