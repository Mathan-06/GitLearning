from django.urls import path
from .views import NoteListCreateView
from .views import NoteDetailView

urlpatterns =[
    path('notes/', NoteListCreateView.as_view(),name='notes'),
    path('notes/<int:pk>/', NoteDetailView.as_view(), name='note-detail'),

]