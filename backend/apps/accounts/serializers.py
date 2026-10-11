"""
Serializers de cuentas.

Un serializer hace dos cosas: valida los datos que llegan en una petición (JSON -> Python)
y convierte objetos de la base de datos en JSON para la respuesta (Python -> JSON).
"""
from django.contrib.auth import get_user_model, password_validation
from rest_framework import serializers

# Usamos el modelo de usuario que trae Django (tabla auth_user) a través de get_user_model().
User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    # write_only=True: la contraseña se acepta al registrar, pero NUNCA se devuelve en una respuesta.
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def validate_password(self, value):
        # Aplica los validadores definidos en settings.py (largo mínimo, contraseñas comunes, etc.).
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        # create_user hashea la contraseña antes de guardarla. Nunca uses User(...).save() con password.
        return User.objects.create_user(**validated_data)
