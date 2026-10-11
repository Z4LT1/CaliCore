"""
API de favoritos. Requiere sesión (es el permiso por defecto en settings.py).

    GET    /api/favorites/          los ejercicios que guardó el usuario
    PUT    /api/favorites/<slug>/   guardar un ejercicio
    DELETE /api/favorites/<slug>/   quitarlo

Por qué PUT y DELETE sobre el slug, y no POST con un cuerpo: un favorito se identifica solo
por el ejercicio, y ambas operaciones son "idempotentes". Guardar dos veces deja el mismo
resultado que guardar una, y quitar algo que no estaba no es un error. Así un doble clic
o un reintento de la red no generan duplicados ni errores.

SEGURIDAD: todo se consulta a partir de request.user. No existe ninguna ruta que reciba el id
de otro usuario, así que nadie puede leer ni modificar favoritos ajenos (previene IDOR).
"""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.exercises.models import Exercise
from apps.exercises.serializers import ExerciseListSerializer

from .models import Favorite


class FavoriteListView(APIView):
    def get(self, request):
        # Se parte de los favoritos DEL usuario (ya ordenados del más reciente al más antiguo)
        # y se trae cada ejercicio con sus relaciones en pocas consultas.
        favorites = (Favorite.objects
                     .filter(user=request.user)
                     .select_related("exercise__path__branch")
                     .prefetch_related("exercise__muscles", "exercise__equipment"))
        return Response(ExerciseListSerializer([f.exercise for f in favorites], many=True).data)


class FavoriteDetailView(APIView):
    def put(self, request, slug):
        exercise = get_object_or_404(Exercise, slug=slug)  # slug inexistente -> 404
        _, created = Favorite.objects.get_or_create(user=request.user, exercise=exercise)
        # 201 si se creó ahora, 200 si ya estaba guardado
        return Response({"slug": slug, "favorite": True},
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, slug):
        Favorite.objects.filter(user=request.user, exercise__slug=slug).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
