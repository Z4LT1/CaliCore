"""
Vistas del catálogo. Todo es público y de solo lectura:

    GET /api/exercises/          lista resumida (con filtros opcionales)
    GET /api/exercises/<slug>/   ficha completa de un ejercicio
    GET /api/tree/               el árbol: ramas > caminos > ejercicios

Rendimiento: select_related y prefetch_related traen las relaciones en pocas consultas.
Sin ellos, cada ejercicio de la lista dispararía consultas extra para su rama, sus músculos,
etc. (el problema "N+1": 1 consulta para la lista + N más, una por cada fila).
"""
from django.db.models import Prefetch, Q
from rest_framework import generics, permissions, viewsets

from .models import Branch, Exercise, Path
from .serializers import ExerciseDetailSerializer, ExerciseListSerializer, TreeBranchSerializer


class PublicReadOnly:
    """Configuración común de los endpoints públicos del catálogo."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # ignora tokens: uno viejo o inválido no debe romper el catálogo
    pagination_class = None      # el catálogo cabe en una sola respuesta


class ExerciseViewSet(PublicReadOnly, viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"  # la ficha se pide por slug: /api/exercises/flexion-diamante/

    def get_serializer_class(self):
        return ExerciseDetailSerializer if self.action == "retrieve" else ExerciseListSerializer

    def get_queryset(self):
        queryset = Exercise.objects.select_related("path__branch").prefetch_related("muscles", "equipment")
        if self.action == "retrieve":
            queryset = queryset.select_related("easier", "harder").prefetch_related(
                "steps", "mistakes", "requirements", "unlocks")

        # Filtros opcionales: ?branch=empuje&path=flexiones&difficulty=3&muscle=triceps&equipment=barra&search=diamante
        params = self.request.query_params
        # Una dificultad no numérica (?difficulty=abc) haría fallar la consulta (error 500): sin resultados
        if params.get("difficulty") and not params["difficulty"].isdigit():
            return queryset.none()
        filters = {
            "branch": "path__branch__slug",
            "path": "path__slug",
            "difficulty": "difficulty",
            "muscle": "muscles__slug",
            "equipment": "equipment__slug",
        }
        for param, lookup in filters.items():
            value = params.get(param)
            if value:
                queryset = queryset.filter(**{lookup: value})

        search = params.get("search")
        if search:
            # El ORM parametriza el valor: no hay inyección SQL aunque el texto traiga comillas o SQL
            queryset = queryset.filter(Q(name__icontains=search) | Q(summary__icontains=search))

        # distinct(): al filtrar por una relación muchos a muchos, un ejercicio podría repetirse
        return queryset.distinct()


class TreeView(PublicReadOnly, generics.ListAPIView):
    """El árbol completo en una sola respuesta (y en un número fijo de consultas)."""

    serializer_class = TreeBranchSerializer

    def get_queryset(self):
        exercises = Exercise.objects.order_by("step").prefetch_related("requirements")
        paths = Path.objects.order_by("order").prefetch_related(Prefetch("exercises", queryset=exercises))
        return Branch.objects.prefetch_related(Prefetch("paths", queryset=paths))
