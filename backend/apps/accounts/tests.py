"""
Pruebas de cuentas. Se ejecutan con:  python manage.py test

Cada prueba corre sobre una base de datos temporal y vacía, así que no toca tus datos reales.
"""
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


class AuthTests(APITestCase):
    def setUp(self):
        cache.clear()  # reinicia los contadores de límite de peticiones entre pruebas

    def test_register_creates_user_and_returns_token(self):
        response = self.client.post(
            "/api/auth/register/", {"username": "ana", "password": "Clave-segura-123"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("token", response.data)
        self.assertTrue(User.objects.filter(username="ana").exists())

    def test_register_rejects_weak_password(self):
        response = self.client.post(
            "/api/auth/register/", {"username": "ana", "password": "12345678"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_password_is_stored_hashed(self):
        self.client.post("/api/auth/register/", {"username": "ana", "password": "Clave-segura-123"}, format="json")
        stored = User.objects.get(username="ana").password
        self.assertNotEqual(stored, "Clave-segura-123")
        self.assertTrue(stored.startswith("pbkdf2_"))

    def test_login_ok_and_wrong_password(self):
        User.objects.create_user("ana", password="Clave-segura-123")
        ok = self.client.post("/api/auth/login/", {"username": "ana", "password": "Clave-segura-123"}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertIn("token", ok.data)
        bad = self.client.post("/api/auth/login/", {"username": "ana", "password": "otra"}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_login_ignores_stale_token(self):
        """Un token inválido en la cabecera no debe impedir iniciar sesión."""
        User.objects.create_user("ana", password="Clave-segura-123")
        self.client.credentials(HTTP_AUTHORIZATION="Token token-viejo-que-no-existe")
        response = self.client.post("/api/auth/login/", {"username": "ana", "password": "Clave-segura-123"}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_me_requires_authentication(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_logout_invalidates_token(self):
        token = self.client.post(
            "/api/auth/register/", {"username": "ana", "password": "Clave-segura-123"}, format="json"
        ).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
