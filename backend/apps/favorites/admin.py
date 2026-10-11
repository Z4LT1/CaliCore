from django.contrib import admin

from .models import Favorite


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ["user", "exercise", "created_at"]
    list_filter = ["exercise__path__branch"]
    search_fields = ["user__username", "exercise__name"]
