"""Pruebas del catálogo: las reglas de los modelos y la carga desde el archivo JSON."""
import json
import os
import tempfile
from io import StringIO

from django.core.exceptions import ValidationError
from django.core.management import CommandError, call_command
from django.db import IntegrityError
from django.test import TestCase
from rest_framework.test import APITestCase

from .management.commands.seed_catalog import DEFAULT_FILE
from .models import Branch, Exercise, ExerciseStep, Path


class CatalogModelTests(TestCase):
    def setUp(self):
        branch = Branch.objects.create(slug="empuje", name="Empuje", order=1)
        self.path = Path.objects.create(branch=branch, slug="flexiones", name="Flexiones", order=1)

    def make(self, slug, step, difficulty=1):
        return Exercise(path=self.path, step=step, slug=slug, name=slug, difficulty=difficulty, summary="Resumen.")

    def test_difficulty_out_of_range_fails_validation(self):
        # full_clean() ejecuta los validadores (es lo que hacen el admin y los formularios)
        with self.assertRaises(ValidationError):
            self.make("dificil", 1, difficulty=6).full_clean()

    def test_database_rejects_difficulty_out_of_range(self):
        # Aunque alguien se salte los validadores, la restricción de la base de datos lo impide
        with self.assertRaises(IntegrityError):
            self.make("cero", 1, difficulty=0).save()

    def test_two_exercises_cannot_share_a_step_in_the_same_path(self):
        self.make("primero", 1).save()
        with self.assertRaises(IntegrityError):
            self.make("repetido", 1).save()

    def test_requirements_are_one_way_and_reachable_from_both_sides(self):
        base = self.make("flexion-estandar", 1)
        base.save()
        goal = self.make("flexion-diamante", 2, difficulty=2)
        goal.save()
        goal.requirements.add(base)
        self.assertEqual(list(goal.requirements.all()), [base])
        self.assertEqual(list(base.requirements.all()), [])  # no es simétrico
        self.assertEqual(list(base.unlocks.all()), [goal])   # y se puede preguntar al revés


class SeedCatalogTests(TestCase):
    """El comando seed_catalog con el archivo real del proyecto y con archivos de prueba."""

    def test_real_catalog_file_loads(self):
        call_command("seed_catalog", stdout=StringIO())
        self.assertEqual(Branch.objects.count(), 6)  # el tronco y las 5 ramas
        cima = Exercise.objects.get(slug="flexion-una-mano")
        self.assertEqual(cima.path.slug, "flexiones")
        self.assertTrue(cima.steps.exists())
        self.assertEqual(cima.easier.slug, "flexion-una-mano-elevada")
        self.assertEqual([e.slug for e in cima.requirements.all()], ["flexion-una-mano-elevada"])

    def test_running_twice_does_not_duplicate(self):
        call_command("seed_catalog", stdout=StringIO())
        counts = (Exercise.objects.count(), ExerciseStep.objects.count(), Path.objects.count())
        call_command("seed_catalog", stdout=StringIO())
        self.assertEqual((Exercise.objects.count(), ExerciseStep.objects.count(), Path.objects.count()), counts)

    def test_unknown_reference_is_rejected_and_nothing_is_saved(self):
        data = json.loads(DEFAULT_FILE.read_text(encoding="utf-8"))
        data["exercises"][0]["requires"] = ["ejercicio-inventado"]
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tmp:
            json.dump(data, tmp)
        try:
            with self.assertRaisesMessage(CommandError, "ejercicio-inventado"):
                call_command("seed_catalog", file=tmp.name, stdout=StringIO())
        finally:
            os.remove(tmp.name)
        self.assertEqual(Exercise.objects.count(), 0)  # todo o nada: no quedó nada a medias


class CatalogApiTests(APITestCase):
    """La API pública del catálogo, usando el archivo real como datos."""

    @classmethod
    def setUpTestData(cls):
        call_command("seed_catalog", stdout=StringIO())

    def test_list_is_public_and_summarized(self):
        response = self.client.get("/api/exercises/")
        self.assertEqual(response.status_code, 200)
        first = response.data[0]
        self.assertEqual(first["branch"], "Empuje")
        self.assertIn("summary", first)
        self.assertNotIn("steps", first)  # la lista no trae la ficha completa

    def test_filters(self):
        self.assertEqual(len(self.client.get("/api/exercises/?path=flexiones").data), 6)
        self.assertEqual(len(self.client.get("/api/exercises/?branch=traccion").data), 0)
        self.assertEqual(len(self.client.get("/api/exercises/?difficulty=4").data), 2)
        self.assertEqual(len(self.client.get("/api/exercises/?equipment=superficie-elevada").data), 1)
        self.assertEqual(len(self.client.get("/api/exercises/?muscle=antebrazo").data), 1)

    def test_invalid_difficulty_returns_empty_instead_of_error(self):
        response = self.client.get("/api/exercises/?difficulty=abc")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_search_is_safe_against_sql_injection_payloads(self):
        response = self.client.get("/api/exercises/", {"search": "' OR 1=1 --"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_detail_has_full_sheet(self):
        data = self.client.get("/api/exercises/flexion-diamante/").data
        self.assertEqual(len(data["steps"]), 4)
        self.assertTrue(data["mistakes"][0]["fix"])
        self.assertEqual([r["slug"] for r in data["requirements"]], ["flexion-estandar"])
        self.assertEqual([u["slug"] for u in data["unlocks"]], ["flexion-arquera"])
        self.assertEqual(data["easier"]["slug"], "flexion-estandar")

    def test_unknown_exercise_is_404(self):
        self.assertEqual(self.client.get("/api/exercises/no-existe/").status_code, 404)

    def test_tree_structure(self):
        branches = self.client.get("/api/tree/").data
        self.assertEqual(branches[0]["slug"], "tronco")
        empuje = next(b for b in branches if b["slug"] == "empuje")
        flexiones = empuje["paths"][0]
        self.assertEqual([e["step"] for e in flexiones["exercises"]], [1, 2, 3, 4, 5, 6])
        self.assertEqual(flexiones["exercises"][1]["requires"], ["flexion-de-rodillas"])

    def test_tree_uses_a_fixed_number_of_queries(self):
        # Ramas + caminos + ejercicios + requisitos = 4 consultas, sin importar cuántos ejercicios haya
        with self.assertNumQueries(4):
            self.client.get("/api/tree/")

    def test_invalid_token_does_not_break_public_catalog(self):
        self.client.credentials(HTTP_AUTHORIZATION="Token invalido")
        self.assertEqual(self.client.get("/api/exercises/").status_code, 200)
        self.assertEqual(self.client.get("/api/tree/").status_code, 200)

    def test_catalog_is_read_only(self):
        self.assertEqual(self.client.post("/api/exercises/", {"name": "X"}).status_code, 405)
