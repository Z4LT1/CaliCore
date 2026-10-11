"""
Comando personalizado:  python manage.py seed_exercises

Carga el catálogo inicial de ejercicios. Es idempotente: puedes ejecutarlo varias veces y no duplica
nada (usa update_or_create por slug), así que también sirve para actualizar descripciones.
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.exercises.models import Exercise

# (nombre, categoría, nivel, músculos, grupo de progresión, paso, descripción)
EXERCISES = [
    # --- PUSH ---
    ("Flexión de rodillas", "push", "beginner", "Pecho, tríceps, hombros", "Flexión", 1,
     "Flexión con las rodillas apoyadas para reducir la carga. Mantén el cuerpo alineado de rodillas a cabeza."),
    ("Flexión estándar", "push", "beginner", "Pecho, tríceps, hombros", "Flexión", 2,
     "Flexión clásica con el cuerpo recto. Baja hasta que el pecho casi toque el suelo y empuja sin arquear la espalda."),
    ("Flexión diamante", "push", "intermediate", "Tríceps, pecho", "Flexión", 3,
     "Manos juntas bajo el pecho formando un rombo con pulgares e índices. Carga más el tríceps."),
    ("Flexión arquera", "push", "advanced", "Pecho, tríceps, hombros", "Flexión", 4,
     "Manos muy separadas: bajas hacia un lado mientras el otro brazo permanece extendido. Preparación para la flexión a una mano."),
    ("Fondos en paralelas", "push", "intermediate", "Pecho, tríceps, hombros", "", 0,
     "Apoyado en barras paralelas, baja hasta que los hombros queden a la altura de los codos y empuja hacia arriba."),
    ("Flexión de pino en pared", "push", "advanced", "Hombros, tríceps", "", 0,
     "Con los pies apoyados en la pared y en posición de pino, baja la cabeza al suelo y empuja."),
    # --- PULL ---
    ("Remo invertido", "pull", "beginner", "Espalda, bíceps", "Dominada", 1,
     "Colgado bajo una barra baja con el cuerpo recto, lleva el pecho hacia la barra."),
    ("Dominada negativa", "pull", "beginner", "Espalda, bíceps", "Dominada", 2,
     "Sube con un salto o apoyo y baja de forma lenta y controlada (3 a 5 segundos)."),
    ("Dominada pronada", "pull", "intermediate", "Dorsales, bíceps", "Dominada", 3,
     "Agarre por encima de la barra, ancho de hombros. Sube hasta pasar la barbilla y baja con control."),
    ("Muscle-up", "pull", "advanced", "Dorsales, pecho, tríceps", "Dominada", 4,
     "Dominada explosiva seguida de una transición por encima de la barra y un fondo para terminar arriba."),
    # --- LEGS ---
    ("Sentadilla al aire", "legs", "beginner", "Cuádriceps, glúteos", "Sentadilla", 1,
     "Sentadilla con el peso corporal, espalda recta y talones apoyados."),
    ("Sentadilla búlgara", "legs", "intermediate", "Cuádriceps, glúteos", "Sentadilla", 2,
     "Con el pie trasero elevado sobre un banco, baja en vertical sobre la pierna delantera."),
    ("Pistol squat", "legs", "advanced", "Cuádriceps, glúteos, equilibrio", "Sentadilla", 3,
     "Sentadilla a una pierna con la otra extendida al frente. Exige fuerza, movilidad y equilibrio."),
    ("Puente de glúteos", "legs", "beginner", "Glúteos, isquiotibiales", "", 0,
     "Tumbado boca arriba con las rodillas flexionadas, eleva la cadera hasta alinear hombros, caderas y rodillas."),
    # --- CORE ---
    ("Plancha abdominal", "core", "beginner", "Abdomen, hombros", "Core", 1,
     "Isométrico apoyado en antebrazos y puntas de los pies, cuerpo en línea recta. No confundir con el planche."),
    ("Elevación de rodillas colgado", "core", "intermediate", "Abdomen, flexores de cadera", "Core", 2,
     "Colgado de una barra, lleva las rodillas al pecho sin balancearte."),
    # --- SKILLS ---
    ("Frog stand", "skills", "beginner", "Hombros, muñecas, core", "Planche", 1,
     "Equilibrio sobre las manos con las rodillas apoyadas sobre los brazos. Primer paso hacia el planche."),
    ("Tuck planche", "skills", "intermediate", "Hombros, core, muñecas", "Planche", 2,
     "Cuerpo elevado sobre las manos con las rodillas recogidas contra el pecho, sin apoyar los pies."),
    ("Advanced tuck planche", "skills", "advanced", "Hombros, core, muñecas", "Planche", 3,
     "Como el tuck planche, pero con la espalda plana y las caderas a la altura de los hombros."),
    ("Straddle planche", "skills", "advanced", "Hombros, core, muñecas", "Planche", 4,
     "Piernas extendidas y abiertas para acortar el brazo de palanca. Cuerpo paralelo al suelo."),
    ("Full planche", "skills", "advanced", "Hombros, core, muñecas", "Planche", 5,
     "Cuerpo completamente extendido y paralelo al suelo, sostenido solo por las manos."),
    ("L-sit", "skills", "intermediate", "Core, tríceps, flexores de cadera", "", 0,
     "Sostén el cuerpo con los brazos extendidos y las piernas rectas al frente, en paralelas o en el suelo."),
    ("Pino contra la pared", "skills", "intermediate", "Hombros, core", "Pino", 1,
     "Invertido con el pecho hacia la pared y el cuerpo alineado. Base para el pino libre."),
    ("Pino libre", "skills", "advanced", "Hombros, core, equilibrio", "Pino", 2,
     "Equilibrio invertido sobre las manos sin apoyo, con el cuerpo alineado y los brazos bloqueados."),
]


class Command(BaseCommand):
    help = "Carga (o actualiza) el catálogo inicial de ejercicios de calistenia."

    def handle(self, *args, **options):
        created_count = 0
        for name, category, level, muscles, group, step, description in EXERCISES:
            _, created = Exercise.objects.update_or_create(
                slug=slugify(name),  # clave para decidir si crear o actualizar
                defaults={
                    "name": name,
                    "category": category,
                    "level": level,
                    "muscles": muscles,
                    "progression_group": group,
                    "progression_step": step,
                    "description": description,
                },
            )
            created_count += int(created)
        self.stdout.write(self.style.SUCCESS(
            f"Catálogo listo: {created_count} creados, {len(EXERCISES) - created_count} actualizados."
        ))
