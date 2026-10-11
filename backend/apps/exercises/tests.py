"""Pruebas de los modelos del catálogo: las reglas que la base de datos debe hacer cumplir."""
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from .models import Branch, Exercise, Path


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
