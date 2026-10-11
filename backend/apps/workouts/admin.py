from django.contrib import admin

from .models import WorkoutLog


@admin.register(WorkoutLog)
class WorkoutLogAdmin(admin.ModelAdmin):
    list_display = ["user", "exercise", "performed_on", "sets", "reps", "seconds"]
    list_filter = ["performed_on", "exercise__category"]
    search_fields = ["user__username", "exercise__name"]
