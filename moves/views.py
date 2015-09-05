from .models import Move, Spot
from rest_framework import viewsets
from .serializers import MoveSerializer, SpotSerializer


class MoveViewSet(viewsets.ModelViewSet):
    queryset = Move.objects.all().order_by('-updated_at')
    serializer_class = MoveSerializer


class SpotViewSet(viewsets.ModelViewSet):
    queryset = Spot.objects.all()
    serializer_class = SpotSerializer
