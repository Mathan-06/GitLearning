from django.shortcuts import render


def home(request):
    """Serve the frontend shell. Notes are loaded by JavaScript from /api/notes/."""
    return render(request, "notes/home.html")
