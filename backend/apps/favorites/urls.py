"""URLs de favoritos. Se montan bajo /api/ (ver config/urls.py)."""
from django.urls import path

from .views import FavoriteDetailView, FavoriteListView

urlpatterns = [
    path("favorites/", FavoriteListView.as_view(), name="favorite-list"),
    path("favorites/<slug:slug>/", FavoriteDetailView.as_view(), name="favorite-detail"),
]
