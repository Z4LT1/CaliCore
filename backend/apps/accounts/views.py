"""
Vistas de cuentas: registro, login, logout y "quién soy".

Autenticación por token: al registrarte o iniciar sesión recibes un token (una cadena larga y aleatoria).
El frontend lo guarda y lo envía en cada petición como  "Authorization: Token <token>".
Cerrar sesión borra ese token del servidor, así que deja de servir.
"""
from rest_framework import generics, permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import RegisterSerializer


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/  ->  crea la cuenta y devuelve el token."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    # Lista vacía = ignora cualquier token que venga en la petición. Así un token viejo o inválido
    # guardado en el navegador no impide registrarse.
    authentication_classes = []
    # Límite estricto ("auth": 20 por minuto, ver settings.py) contra registros masivos automatizados.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)  # si hay errores, DRF responde 400 con el detalle
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "username": user.username}, status=status.HTTP_201_CREATED)


class LoginView(ObtainAuthToken):
    """POST /api/auth/login/  ->  valida usuario y contraseña y devuelve el token."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]  # frena la fuerza bruta de contraseñas
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)  # credenciales incorrectas -> 400
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "username": user.username})


class LogoutView(APIView):
    """POST /api/auth/logout/  ->  borra el token actual (requiere estar autenticado)."""

    def post(self, request):
        request.auth.delete()  # request.auth es el objeto Token con el que llegó la petición
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """GET /api/auth/me/  ->  datos básicos del usuario autenticado."""

    def get(self, request):
        user = request.user
        return Response({
            "username": user.username,
            "email": user.email,
            "date_joined": user.date_joined.date(),  # solo la fecha: la hora exacta no aporta en el perfil
        })
