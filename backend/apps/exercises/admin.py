"""Registra el modelo en el panel /admin/ para poder crear y editar ejercicios desde el navegador."""
from django.contrib import admin

from .models import Exercise


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "level", "progression_group", "progression_step"]
    list_filter = ["category", "level"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}  # autocompleta el slug mientras escribes el nombre
