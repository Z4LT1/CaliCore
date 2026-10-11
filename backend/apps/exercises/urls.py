"""URLs del catálogo. El router crea las rutas del ViewSet automáticamente."""
from rest_framework.routers import SimpleRouter

from .views import ExerciseViewSet

router = SimpleRouter()
router.register("exercises", ExerciseViewSet, basename="exercise")

urlpatterns = router.urls
