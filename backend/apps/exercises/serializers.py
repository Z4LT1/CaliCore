"""
Serializers del catálogo: convierten los modelos en JSON para la API.

Hay dos formatos de ejercicio:
- ExerciseListSerializer: lo justo para una tarjeta en la biblioteca (rápido, para listas largas).
- ExerciseDetailSerializer: la ficha completa, para cuando se abre un ejercicio.
"""
from rest_framework import serializers

from .models import Branch, CommonMistake, Exercise, Path


class ExerciseLinkSerializer(serializers.ModelSerializer):
    """Referencia corta a otro ejercicio (requisitos, variantes): solo lo necesario para enlazarlo."""

    class Meta:
        model = Exercise
        fields = ["slug", "name", "difficulty"]


class ExerciseListSerializer(serializers.ModelSerializer):
    branch = serializers.CharField(source="path.branch.name", read_only=True)
    path = serializers.CharField(source="path.name", read_only=True)
    measure_display = serializers.CharField(source="get_measure_display", read_only=True)
    # SlugRelatedField muestra el campo "name" de cada músculo en vez de su id numérico
    muscles = serializers.SlugRelatedField(many=True, read_only=True, slug_field="name")
    equipment = serializers.SlugRelatedField(many=True, read_only=True, slug_field="name")

    class Meta:
        model = Exercise
        fields = ["slug", "name", "branch", "path", "step", "difficulty", "summary",
                  "measure", "measure_display", "muscles", "equipment"]


class MistakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommonMistake
        fields = ["mistake", "fix"]


class ExerciseDetailSerializer(ExerciseListSerializer):
    """La ficha completa: todo lo de la lista, más pasos, errores, requisitos y variantes."""

    steps = serializers.SlugRelatedField(many=True, read_only=True, slug_field="text")
    mistakes = MistakeSerializer(many=True, read_only=True)
    requirements = ExerciseLinkSerializer(many=True, read_only=True)
    unlocks = ExerciseLinkSerializer(many=True, read_only=True)  # los que se desbloquean con este
    easier = ExerciseLinkSerializer(read_only=True)
    harder = ExerciseLinkSerializer(read_only=True)

    class Meta(ExerciseListSerializer.Meta):
        fields = ExerciseListSerializer.Meta.fields + [
            "steps", "mistakes", "requirements", "unlocks", "easier", "harder"]


# ---------------------------------------------------------------------------
# Árbol: ramas > caminos > ejercicios, con lo necesario para dibujarlo
# ---------------------------------------------------------------------------
class TreeExerciseSerializer(serializers.ModelSerializer):
    # Solo los slugs de los requisitos: con eso el frontend traza las conexiones
    requires = serializers.SlugRelatedField(source="requirements", many=True, read_only=True, slug_field="slug")

    class Meta:
        model = Exercise
        fields = ["slug", "name", "step", "difficulty", "requires"]


class TreePathSerializer(serializers.ModelSerializer):
    exercises = TreeExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = Path
        fields = ["slug", "name", "description", "exercises"]


class TreeBranchSerializer(serializers.ModelSerializer):
    paths = TreePathSerializer(many=True, read_only=True)

    class Meta:
        model = Branch
        fields = ["slug", "name", "is_trunk", "paths"]
