"""
Vistas de entrenamientos.

ModelViewSet genera el CRUD completo:
    GET    /api/workouts/        lista TUS registros
    POST   /api/workouts/        crea un registro
    GET    /api/workouts/<id>/   detalle
    PUT/PATCH /api/workouts/<id>/ edita
    DELETE /api/workouts/<id>/   elimina
Más una acción extra:  GET /api/workouts/summary/  (estadísticas).
Requiere sesión iniciada (es el permiso por defecto definido en settings.py).
"""
from datetime import timedelta

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import WorkoutLog
from .serializers import WorkoutLogSerializer


class WorkoutLogViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutLogSerializer

    def get_queryset(self):
        # SEGURIDAD (control de acceso por objeto): solo devolvemos registros del usuario autenticado.
        # Como todas las acciones parten de este queryset, pedir el id de un registro ajeno da 404.
        # Si filtráramos solo en la lista, cualquiera podría leer o borrar registros ajenos adivinando ids (IDOR).
        return WorkoutLog.objects.filter(user=self.request.user).select_related("exercise")

    def perform_create(self, serializer):
        # El dueño se fija aquí, en el servidor, nunca desde los datos que envía el cliente.
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Estadísticas del usuario: totales y actividad de los últimos 7 días."""
        logs = self.get_queryset()
        week_start = timezone.localdate() - timedelta(days=6)
        totals = logs.aggregate(total_logs=Count("id"), total_sets=Sum("sets"))
        return Response({
            "total_logs": totals["total_logs"] or 0,
            "total_sets": totals["total_sets"] or 0,
            # order_by() vacío: sin él, el orden por defecto del modelo alteraría el DISTINCT.
            "distinct_exercises": logs.order_by().values("exercise").distinct().count(),
            "logs_last_7_days": logs.filter(performed_on__gte=week_start).count(),
        })
