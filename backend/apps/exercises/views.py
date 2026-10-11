"""
Vistas del catálogo de ejercicios.

ReadOnlyModelViewSet genera automáticamente dos endpoints de solo lectura:
    GET /api/exercises/          lista (con filtros opcionales)
    GET /api/exercises/<slug>/   detalle de un ejercicio
El catálogo es público: no hace falta iniciar sesión para verlo.
"""
from django.db.models import Q
from rest_framework import permissions, viewsets

from .models import Exercise
from .serializers import ExerciseSerializer


class ExerciseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []   # endpoint público: ignora tokens (un token viejo no debe romper el catálogo)
    pagination_class = None       # el catálogo es pequeño: devolvemos una lista simple, sin paginar
    lookup_field = "slug"         # el detalle se pide por slug en vez de por id

    def get_queryset(self):
        """Aplica los filtros opcionales de la URL: ?category=push&level=beginner&search=dominada"""
        queryset = Exercise.objects.all()
        params = self.request.query_params

        category = params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        level = params.get("level")
        if level:
            queryset = queryset.filter(level=level)

        search = params.get("search")
        if search:
            # Q permite combinar condiciones con OR (|). El ORM parametriza los valores:
            # no hay riesgo de inyección SQL aunque el usuario escriba comillas o SQL.
            queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))

        return queryset
