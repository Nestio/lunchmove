from django.http import HttpResponse
from django.shortcuts import render
from .models import Move, Spot
from rest_framework import viewsets
from .serializers import MoveSerializer, SpotSerializer

def index(request):
    return render(request, 'moves/index.html', {})

class MoveViewSet(viewsets.ModelViewSet):
    queryset = Move.objects.recent()
    serializer_class = MoveSerializer


class SpotViewSet(viewsets.ModelViewSet):
    queryset = Spot.objects.all()
    serializer_class = SpotSerializer
