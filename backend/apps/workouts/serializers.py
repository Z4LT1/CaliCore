"""Serializer de registros de entrenamiento: valida lo que envía el usuario y arma el JSON de respuesta."""
from django.utils import timezone
from rest_framework import serializers

from .models import WorkoutLog


class WorkoutLogSerializer(serializers.ModelSerializer):
    # Nombre del ejercicio listo para mostrar (solo lectura: no se envía al crear).
    exercise_name = serializers.CharField(source="exercise.name", read_only=True)

    class Meta:
        model = WorkoutLog
        # Fíjate en que "user" NO está en la lista: el dueño nunca lo decide el cliente, lo fija la vista
        # con request.user. Así nadie puede crear registros a nombre de otra persona.
        fields = ["id", "exercise", "exercise_name", "performed_on", "sets", "reps", "seconds", "notes", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_performed_on(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("La fecha no puede ser futura.")
        return value

    def validate(self, attrs):
        # Validación cruzada: debe haber repeticiones o segundos. Si es una edición parcial (PATCH),
        # completa con los valores que ya tiene el registro.
        reps = attrs.get("reps", getattr(self.instance, "reps", None))
        seconds = attrs.get("seconds", getattr(self.instance, "seconds", None))
        if not reps and not seconds:
            raise serializers.ValidationError("Indica las repeticiones o los segundos (al menos uno).")
        return attrs
