"""
Comando:  python manage.py seed_catalog            (lee apps/exercises/data/catalog.json)
          python manage.py seed_catalog --file X   (lee otro archivo, útil en las pruebas)

Lleva el catálogo del archivo JSON a la base de datos. El archivo es la fuente oficial:
se revisa en Git y este comando lo aplica.

Garantías:
- Idempotente: ejecutarlo dos veces deja el mismo resultado (busca cada fila por su slug y la
  actualiza, en vez de crearla de nuevo).
- Todo o nada: corre dentro de una transacción. Si algo falla a mitad de camino, no queda
  ningún cambio a medias.
- Valida antes de escribir: si un ejercicio menciona un músculo, camino o requisito que no
  existe en el archivo, se detiene y dice exactamente cuál.
"""
import json
from pathlib import Path as FilePath

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.exercises.models import Branch, CommonMistake, Equipment, Exercise, ExerciseStep, Muscle, Path

DEFAULT_FILE = FilePath(__file__).resolve().parents[2] / "data" / "catalog.json"


def validate(data):
    """Revisa que cada referencia apunte a algo definido en el mismo archivo. Devuelve la lista de errores."""
    errors = []
    muscles = {m["slug"] for m in data["muscles"]}
    equipment = {e["slug"] for e in data["equipment"]}
    paths = {p["slug"] for b in data["branches"] for p in b["paths"]}
    exercises = [e["slug"] for e in data["exercises"]]
    known = set(exercises)

    if len(known) != len(exercises):
        errors.append("Hay slugs de ejercicio repetidos.")

    for ex in data["exercises"]:
        where = f"Ejercicio '{ex['slug']}'"
        if ex["path"] not in paths:
            errors.append(f"{where}: el camino '{ex['path']}' no existe.")
        errors += [f"{where}: el músculo '{m}' no existe." for m in ex["muscles"] if m not in muscles]
        errors += [f"{where}: el equipamiento '{q}' no existe." for q in ex["equipment"] if q not in equipment]
        errors += [f"{where}: el requisito '{r}' no existe." for r in ex["requires"] if r not in known]
        for key in ("easier", "harder"):
            if ex.get(key) and ex[key] not in known:
                errors.append(f"{where}: la variante '{ex[key]}' no existe.")
        if not 1 <= ex["difficulty"] <= 5:
            errors.append(f"{where}: la dificultad debe estar entre 1 y 5.")
    return errors


class Command(BaseCommand):
    help = "Carga el catálogo de ejercicios desde el archivo JSON (fuente oficial)."

    def add_arguments(self, parser):
        parser.add_argument("--file", default=str(DEFAULT_FILE), help="Ruta del archivo JSON del catálogo.")

    def handle(self, *args, **options):
        try:
            data = json.loads(FilePath(options["file"]).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise CommandError(f"No se pudo leer el archivo: {error}") from error

        errors = validate(data)
        if errors:
            raise CommandError("El catálogo tiene errores:\n  - " + "\n  - ".join(errors))

        with transaction.atomic():
            self.load(data)

        total = Exercise.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f"Catálogo cargado: {Branch.objects.count()} ramas, {Path.objects.count()} caminos, {total} ejercicios."))

        # Avisar (sin borrar) si en la base hay ejercicios que ya no están en el archivo
        in_file = {e["slug"] for e in data["exercises"]}
        orphans = Exercise.objects.exclude(slug__in=in_file).values_list("slug", flat=True)
        if orphans:
            self.stdout.write(self.style.WARNING(
                "En la base hay ejercicios que no están en el archivo: " + ", ".join(orphans)))

    def load(self, data):
        # 1. Tablas sin dependencias
        muscles = {m["slug"]: Muscle.objects.update_or_create(slug=m["slug"], defaults={"name": m["name"]})[0]
                   for m in data["muscles"]}
        equipment = {e["slug"]: Equipment.objects.update_or_create(slug=e["slug"], defaults={"name": e["name"]})[0]
                     for e in data["equipment"]}

        # 2. Ramas y sus caminos
        paths = {}
        for b in data["branches"]:
            branch, _ = Branch.objects.update_or_create(slug=b["slug"], defaults={
                "name": b["name"], "order": b["order"], "is_trunk": b.get("is_trunk", False)})
            for p in b["paths"]:
                paths[p["slug"]], _ = Path.objects.update_or_create(slug=p["slug"], defaults={
                    "branch": branch, "name": p["name"], "order": p["order"], "description": p.get("description", "")})

        # 3. Ejercicios con sus datos propios. Los pasos y errores se reemplazan completos:
        #    así, si en el archivo se quita un paso, también desaparece de la base.
        exercises = {}
        for ex in data["exercises"]:
            exercise, _ = Exercise.objects.update_or_create(slug=ex["slug"], defaults={
                "name": ex["name"], "path": paths[ex["path"]], "step": ex["step"],
                "difficulty": ex["difficulty"], "summary": ex["summary"], "measure": ex["measure"]})
            exercise.full_clean()  # aplica los validadores del modelo (por ejemplo, el largo de los textos)
            exercise.muscles.set([muscles[m] for m in ex["muscles"]])
            exercise.equipment.set([equipment[q] for q in ex["equipment"]])
            exercise.steps.all().delete()
            ExerciseStep.objects.bulk_create(
                ExerciseStep(exercise=exercise, order=i, text=text) for i, text in enumerate(ex["steps"], start=1))
            exercise.mistakes.all().delete()
            CommonMistake.objects.bulk_create(
                CommonMistake(exercise=exercise, order=i, mistake=m["mistake"], fix=m["fix"])
                for i, m in enumerate(ex["mistakes"], start=1))
            exercises[ex["slug"]] = exercise

        # 4. Relaciones entre ejercicios: van al final porque necesitan que todos existan ya
        for ex in data["exercises"]:
            exercise = exercises[ex["slug"]]
            exercise.requirements.set([exercises[r] for r in ex["requires"]])
            exercise.easier = exercises.get(ex.get("easier"))
            exercise.harder = exercises.get(ex.get("harder"))
            exercise.save(update_fields=["easier", "harder"])
