from django.urls import path

from .frontend import home

urlpatterns = [
    path("", home, name="home"),
]
