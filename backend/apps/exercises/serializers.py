"""Convierte objetos Exercise en JSON para la API."""
from rest_framework import serializers

from .models import Exercise


class ExerciseSerializer(serializers.ModelSerializer):
    # Además del valor guardado ("push") enviamos el texto legible ("Empuje (Push)") para mostrarlo tal cual.
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    level_display = serializers.CharField(source="get_level_display", read_only=True)

    class Meta:
        model = Exercise
        fields = [
            "id", "name", "slug",
            "category", "category_display",
            "level", "level_display",
            "description", "muscles",
            "progression_group", "progression_step",
        ]
