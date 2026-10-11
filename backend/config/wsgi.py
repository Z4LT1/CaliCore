"""Interfaz WSGI: es lo que un servidor de producción (gunicorn, etc.) usa para hablar con Django.
En desarrollo no la tocas: 'runserver' ya se encarga."""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()
