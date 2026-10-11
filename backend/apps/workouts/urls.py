"""URLs de entrenamientos. Se montan bajo /api/ (ver config/urls.py)."""
from rest_framework.routers import SimpleRouter

from .views import WorkoutLogViewSet

router = SimpleRouter()
router.register("workouts", WorkoutLogViewSet, basename="workout")

urlpatterns = router.urls
