"""
Panel /admin/ del catálogo: sirve para MIRAR y hacer correcciones rápidas.
La fuente oficial de los datos es data/catalog.json (ver el comando seed_catalog):
si cambias algo aquí y luego vuelves a cargar el archivo, el archivo manda.
"""
from django.contrib import admin

from .models import Branch, CommonMistake, Equipment, Exercise, ExerciseStep, Muscle, Path


class PathInline(admin.TabularInline):
    model = Path
    extra = 0
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ["name", "order", "is_trunk"]
    inlines = [PathInline]  # los caminos se ven y editan dentro de su rama


@admin.register(Path)
class PathAdmin(admin.ModelAdmin):
    list_display = ["name", "branch", "order"]
    list_filter = ["branch"]


class StepInline(admin.TabularInline):
    model = ExerciseStep
    extra = 0


class MistakeInline(admin.TabularInline):
    model = CommonMistake
    extra = 0


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ["name", "path", "step", "difficulty", "measure"]
    list_filter = ["path__branch", "difficulty", "measure", "equipment"]
    search_fields = ["name", "summary"]
    prepopulated_fields = {"slug": ("name",)}           # autocompleta el slug mientras escribes el nombre
    filter_horizontal = ["muscles", "equipment", "requirements"]  # selector cómodo para listas largas
    autocomplete_fields = ["easier", "harder"]           # buscador en vez de un desplegable con 90 opciones
    inlines = [StepInline, MistakeInline]                 # la ficha completa en una sola página


admin.site.register(Muscle)
admin.site.register(Equipment)
