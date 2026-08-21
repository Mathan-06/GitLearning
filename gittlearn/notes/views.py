from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Note
from .serializers import NoteSerializer

class NoteListCreateView(APIView):

    def get(self,request):
        notes=Note.objects.all()
        serializer = NoteSerializer(notes,many=True)
        return Response(serializer.data)

    def post(self,request):
        serializer = NoteSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)


        return Response(serializer.errors,status=400)

class NoteDetailView(APIView):

    def get(self,request,pk):
        note = Note.objects.get(pk=pk)
        serializer = NoteSerializer(note)
        return Response(serializer.data)

    def put(self,request,pk):
        note = Note.objects.get(pk=pk)
        serializer = NoteSerializer(note,data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.error,status=400)

    def delete(self,request,pk):
        note = Note.objects.get(pk=pk)
        note.delete()

        return Response({"Message":"Note deleted Successfully"})


    