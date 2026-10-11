"""Pruebas de entrenamientos: permisos, aislamiento entre usuarios, validaciones y estadísticas."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.exercises.models import Exercise

from .models import WorkoutLog

User = get_user_model()


class WorkoutApiTests(APITestCase):
    def setUp(self):
        self.exercise = Exercise.objects.create(
            name="Flexión estándar", slug="flexion-estandar", category="push",
            level="beginner", description="Flexión clásica.",
        )
        self.ana = User.objects.create_user("ana", password="Clave-segura-123")
        self.beto = User.objects.create_user("beto", password="Clave-segura-123")

    def login_as(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def payload(self, **overrides):
        data = {"exercise": self.exercise.id, "sets": 3, "reps": 10}
        data.update(overrides)
        return data

    def test_requires_authentication(self):
        self.assertEqual(self.client.get("/api/workouts/").status_code, 401)
        self.assertEqual(self.client.post("/api/workouts/", self.payload(), format="json").status_code, 401)

    def test_create_assigns_owner_from_request_not_from_body(self):
        self.login_as(self.ana)
        # Intento de "mass assignment": enviar un user ajeno en el cuerpo debe ser ignorado.
        response = self.client.post("/api/workouts/", self.payload(user=self.beto.id), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(WorkoutLog.objects.get().user, self.ana)

    def test_user_only_sees_own_logs(self):
        WorkoutLog.objects.create(user=self.ana, exercise=self.exercise, sets=3, reps=10)
        self.login_as(self.beto)
        response = self.client.get("/api/workouts/")
        self.assertEqual(response.data["count"], 0)

    def test_cannot_access_or_delete_other_users_log(self):
        log = WorkoutLog.objects.create(user=self.ana, exercise=self.exercise, sets=3, reps=10)
        self.login_as(self.beto)
        self.assertEqual(self.client.get(f"/api/workouts/{log.id}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/workouts/{log.id}/").status_code, 404)
        self.assertTrue(WorkoutLog.objects.filter(id=log.id).exists())

    def test_owner_can_delete_own_log(self):
        log = WorkoutLog.objects.create(user=self.ana, exercise=self.exercise, sets=3, reps=10)
        self.login_as(self.ana)
        self.assertEqual(self.client.delete(f"/api/workouts/{log.id}/").status_code, 204)

    def test_requires_reps_or_seconds(self):
        self.login_as(self.ana)
        response = self.client.post("/api/workouts/", {"exercise": self.exercise.id, "sets": 3}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_accepts_seconds_only(self):
        self.login_as(self.ana)
        response = self.client.post("/api/workouts/", {"exercise": self.exercise.id, "sets": 3, "seconds": 30}, format="json")
        self.assertEqual(response.status_code, 201)

    def test_rejects_future_date_and_out_of_range_values(self):
        self.login_as(self.ana)
        tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()
        self.assertEqual(self.client.post("/api/workouts/", self.payload(performed_on=tomorrow), format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/workouts/", self.payload(sets=0), format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/workouts/", self.payload(sets=999), format="json").status_code, 400)

    def test_summary(self):
        WorkoutLog.objects.create(user=self.ana, exercise=self.exercise, sets=3, reps=10)
        WorkoutLog.objects.create(user=self.ana, exercise=self.exercise, sets=4, reps=8,
                                  performed_on=timezone.localdate() - timedelta(days=30))
        WorkoutLog.objects.create(user=self.beto, exercise=self.exercise, sets=5, reps=5)  # no debe contar
        self.login_as(self.ana)
        data = self.client.get("/api/workouts/summary/").data
        self.assertEqual(data, {"total_logs": 2, "total_sets": 7, "distinct_exercises": 1, "logs_last_7_days": 1})
