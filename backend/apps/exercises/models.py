"""
Modelos del catálogo de ejercicios: la estructura del árbol de CaliCore.

Un modelo es una clase de Python que Django convierte en una tabla de la base de datos:
cada atributo es una columna y cada instancia es una fila.

Cómo se relacionan:

    Branch (rama)          Empuje, Tracción, Pierna, Core, Habilidades... y el tronco
      └── Path (camino)    Flexiones, Dominadas, Planche... cada uno termina en una cima
            └── Exercise   cada peldaño del camino, en orden (step)
                  ├── ExerciseStep     pasos de ejecución, numerados
                  ├── CommonMistake    errores comunes con su corrección
                  ├── muscles ──────── Muscle        (muchos a muchos)
                  ├── equipment ────── Equipment     (muchos a muchos)
                  ├── requirements ─── Exercise      (otros ejercicios que debes dominar antes)
                  └── easier / harder ─ Exercise     (variantes para retroceder o avanzar)

Los datos no se cargan a mano: la fuente oficial es data/catalog.json y el comando
`python manage.py seed_catalog` los lleva a la base de datos.
"""
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Branch(models.Model):
    """Una rama del árbol (o el tronco, que agrupa los fundamentos)."""

    slug = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=60)
    order = models.PositiveSmallIntegerField(default=0)  # posición al mostrarlas
    is_trunk = models.BooleanField(default=False)        # True solo para el tronco (fundamentos)

    class Meta:
        ordering = ["order"]
        verbose_name = "rama"

    def __str__(self):
        return self.name


class Path(models.Model):
    """Un camino dentro de una rama: la secuencia de ejercicios hacia una habilidad (su cima)."""

    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="paths")
    slug = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=80)
    order = models.PositiveSmallIntegerField(default=0)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["branch__order", "order"]
        verbose_name = "camino"

    def __str__(self):
        return f"{self.branch} › {self.name}"


class Muscle(models.Model):
    """Un músculo o grupo muscular. En tabla propia para escribirlo siempre igual y poder filtrar."""

    slug = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=60)

    class Meta:
        ordering = ["name"]
        verbose_name = "músculo"

    def __str__(self):
        return self.name


class Equipment(models.Model):
    """Equipamiento necesario: barra, paralelas, suelo, pared..."""

    slug = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=60)

    class Meta:
        ordering = ["name"]
        verbose_name = "equipamiento"
        verbose_name_plural = "equipamiento"

    def __str__(self):
        return self.name


class Exercise(models.Model):
    """Un ejercicio: un peldaño de un camino del árbol."""

    class Measure(models.TextChoices):
        # (valor guardado en la base de datos, texto legible)
        REPS = "reps", "Repeticiones"
        SECONDS = "seconds", "Segundos"

    path = models.ForeignKey(Path, on_delete=models.PROTECT, related_name="exercises")
    step = models.PositiveSmallIntegerField()  # posición dentro de su camino: 1 es la base
    slug = models.SlugField(max_length=90, unique=True)
    name = models.CharField(max_length=80, unique=True)

    # Dificultad de 1 (inicio) a 5 (élite). Los validadores la rechazan fuera de ese rango.
    difficulty = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    summary = models.CharField(max_length=160)  # descripción breve: el reverso de la tarjeta
    measure = models.CharField(max_length=10, choices=Measure.choices, default=Measure.REPS)

    muscles = models.ManyToManyField(Muscle, related_name="exercises", blank=True)
    equipment = models.ManyToManyField(Equipment, related_name="exercises", blank=True)

    # Relaciones con otros ejercicios. symmetrical=False: que A requiera B no significa que B requiera A.
    # related_name="unlocks" permite preguntar al revés: ¿qué ejercicios desbloquea este?
    requirements = models.ManyToManyField("self", symmetrical=False, related_name="unlocks", blank=True)
    # SET_NULL: si se borra la variante, este ejercicio sigue existiendo, solo pierde el enlace.
    easier = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    harder = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    class Meta:
        ordering = ["path__branch__order", "path__order", "step"]
        verbose_name = "ejercicio"
        constraints = [
            # Dos ejercicios no pueden ocupar el mismo peldaño del mismo camino
            models.UniqueConstraint(fields=["path", "step"], name="unique_step_per_path"),
            # Segunda defensa (en la propia base de datos) para el rango de dificultad
            models.CheckConstraint(condition=models.Q(difficulty__gte=1, difficulty__lte=5), name="difficulty_1_to_5"),
        ]

    def __str__(self):
        return self.name


class ExerciseStep(models.Model):
    """Un paso de la ejecución de un ejercicio."""

    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveSmallIntegerField()
    text = models.CharField(max_length=240)

    class Meta:
        ordering = ["order"]
        verbose_name = "paso"
        constraints = [models.UniqueConstraint(fields=["exercise", "order"], name="unique_order_per_exercise")]

    def __str__(self):
        return f"{self.exercise} · paso {self.order}"


class CommonMistake(models.Model):
    """Un error común al hacer el ejercicio y cómo corregirlo."""

    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="mistakes")
    order = models.PositiveSmallIntegerField(default=0)
    mistake = models.CharField(max_length=160)
    fix = models.CharField(max_length=160)

    class Meta:
        ordering = ["order"]
        verbose_name = "error común"
        verbose_name_plural = "errores comunes"

    def __str__(self):
        return self.mistake
