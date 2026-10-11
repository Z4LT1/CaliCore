"""Pruebas del catálogo de ejercicios (público, con filtros)."""
from rest_framework.test import APITestCase

from .models import Exercise


class ExerciseApiTests(APITestCase):
    def setUp(self):
        Exercise.objects.create(name="Flexión estándar", slug="flexion-estandar", category="push",
                                level="beginner", description="Flexión clásica.")
        Exercise.objects.create(name="Dominada pronada", slug="dominada-pronada", category="pull",
                                level="intermediate", description="Agarre por encima de la barra.")
        Exercise.objects.create(name="Pistol squat", slug="pistol-squat", category="legs",
                                level="advanced", description="Sentadilla a una pierna.")

    def test_list_is_public(self):
        response = self.client.get("/api/exercises/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)

    def test_filter_by_category_and_level(self):
        self.assertEqual(len(self.client.get("/api/exercises/?category=push").data), 1)
        self.assertEqual(len(self.client.get("/api/exercises/?level=advanced").data), 1)
        self.assertEqual(len(self.client.get("/api/exercises/?category=push&level=advanced").data), 0)

    def test_search(self):
        response = self.client.get("/api/exercises/?search=dominada")
        self.assertEqual([e["slug"] for e in response.data], ["dominada-pronada"])

    def test_search_is_safe_against_sql_injection_payloads(self):
        response = self.client.get("/api/exercises/", {"search": "' OR 1=1 --"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_detail_by_slug(self):
        response = self.client.get("/api/exercises/pistol-squat/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["level_display"], "Avanzado")

    def test_invalid_token_does_not_break_public_catalog(self):
        self.client.credentials(HTTP_AUTHORIZATION="Token invalido")
        self.assertEqual(self.client.get("/api/exercises/").status_code, 200)
