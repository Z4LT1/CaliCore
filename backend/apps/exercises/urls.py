"""URLs del catálogo. Se montan bajo /api/ (ver config/urls.py)."""
from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import ExerciseViewSet, TreeView

# El router crea /exercises/ y /exercises/<slug>/ a partir del ViewSet
router = SimpleRouter()
router.register("exercises", ExerciseViewSet, basename="exercise")

urlpatterns = [
    path("tree/", TreeView.as_view(), name="tree"),
    *router.urls,
]
