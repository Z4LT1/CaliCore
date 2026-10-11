"""
Modelo del catálogo de ejercicios.

Un modelo es una clase de Python que Django convierte en una tabla de la base de datos:
cada atributo es una columna y cada instancia es una fila.
"""
from django.db import models


class Exercise(models.Model):
    class Category(models.TextChoices):
        # (valor guardado en la BD, texto legible)
        PUSH = "push", "Empuje (Push)"
        PULL = "pull", "Tracción (Pull)"
        LEGS = "legs", "Piernas (Legs)"
        CORE = "core", "Core"
        SKILLS = "skills", "Habilidades (Skills)"

    class Level(models.TextChoices):
        BEGINNER = "beginner", "Principiante"
        INTERMEDIATE = "intermediate", "Intermedio"
        ADVANCED = "advanced", "Avanzado"

    name = models.CharField(max_length=80, unique=True)
    # El slug es un nombre apto para URLs: "Tuck planche" -> "tuck-planche".
    slug = models.SlugField(max_length=90, unique=True)
    category = models.CharField(max_length=10, choices=Category.choices)
    level = models.CharField(max_length=15, choices=Level.choices)
    description = models.TextField()
    muscles = models.CharField(max_length=120, blank=True)

    # Una progresión es una cadena ordenada de ejercicios (ej. "Planche": frog stand -> ... -> full planche).
    # progression_group nombra la cadena y progression_step es la posición dentro de ella.
    # Si el ejercicio no pertenece a ninguna cadena, progression_group queda vacío.
    progression_group = models.CharField(max_length=60, blank=True)
    progression_step = models.PositiveSmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Orden por defecto de las consultas.
        ordering = ["category", "progression_group", "progression_step", "name"]

    def __str__(self):
        return self.name
