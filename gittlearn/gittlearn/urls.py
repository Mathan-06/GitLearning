from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("notes.frontend_urls")),
    path("api/notes/", include("notes.urls")),
]
