"""Pruebas de favoritos: funcionamiento, idempotencia y, sobre todo, aislamiento entre usuarios."""
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import IntegrityError
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.exercises.models import Exercise

from .models import Favorite

User = get_user_model()


class FavoriteApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_catalog", stdout=StringIO())
        cls.ana = User.objects.create_user("ana", password="Clave-segura-123")
        cls.beto = User.objects.create_user("beto", password="Clave-segura-456")

    def login(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_requires_authentication(self):
        self.assertEqual(self.client.get("/api/favorites/").status_code, 401)
        self.assertEqual(self.client.put("/api/favorites/muscle-up/").status_code, 401)

    def test_add_list_and_remove(self):
        self.login(self.ana)
        self.assertEqual(self.client.put("/api/favorites/muscle-up/").status_code, 201)
        self.client.put("/api/favorites/pino-libre/")
        slugs = [e["slug"] for e in self.client.get("/api/favorites/").data]
        self.assertEqual(slugs, ["pino-libre", "muscle-up"])  # el más reciente primero
        self.assertEqual(self.client.delete("/api/favorites/muscle-up/").status_code, 204)
        self.assertEqual([e["slug"] for e in self.client.get("/api/favorites/").data], ["pino-libre"])

    def test_adding_twice_is_idempotent(self):
        self.login(self.ana)
        self.client.put("/api/favorites/muscle-up/")
        self.assertEqual(self.client.put("/api/favorites/muscle-up/").status_code, 200)
        self.assertEqual(Favorite.objects.filter(user=self.ana).count(), 1)

    def test_removing_something_not_saved_is_not_an_error(self):
        self.login(self.ana)
        self.assertEqual(self.client.delete("/api/favorites/muscle-up/").status_code, 204)

    def test_unknown_exercise_is_404(self):
        self.login(self.ana)
        self.assertEqual(self.client.put("/api/favorites/no-existe/").status_code, 404)

    def test_users_only_see_and_change_their_own(self):
        self.login(self.ana)
        self.client.put("/api/favorites/muscle-up/")
        self.login(self.beto)
        self.assertEqual(self.client.get("/api/favorites/").data, [])  # beto no ve los de ana
        self.client.delete("/api/favorites/muscle-up/")                  # ni puede borrarlos
        self.assertTrue(Favorite.objects.filter(user=self.ana, exercise__slug="muscle-up").exists())

    def test_database_rejects_duplicates(self):
        exercise = Exercise.objects.get(slug="muscle-up")
        Favorite.objects.create(user=self.ana, exercise=exercise)
        with self.assertRaises(IntegrityError):
            Favorite.objects.create(user=self.ana, exercise=exercise)
