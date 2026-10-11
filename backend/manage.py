#!/usr/bin/env python
"""Punto de entrada de línea de comandos de Django.

Es el archivo que ejecutas con:  python manage.py <comando>
Ejemplos: runserver, migrate, makemigrations, createsuperuser, test, seed_exercises.
"""
import os
import sys


def main():
    # Le dice a Django cuál es el módulo de configuración (config/settings.py).
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "No se pudo importar Django. ¿Activaste el entorno virtual y ejecutaste "
            "'pip install -r requirements.txt'?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
