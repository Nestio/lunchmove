import datetime
from django.utils import timezone
from django.http import HttpResponse
from django.shortcuts import render
from .models import Move, Spot
from rest_framework import viewsets
from rest_framework import status
from rest_framework.decorators import list_route
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import MoveSerializer, SpotSerializer

def index(request):
    return render(request, 'moves/index.html', {})

class MoveViewSet(viewsets.ModelViewSet):
    queryset = Move.objects.recent()
    serializer_class = MoveSerializer

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        request.session['recent_move'] = serializer.data['id']
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @list_route()
    def recent(self, request):
        pk = request.session.get('recent_move')
        if pk:
            move = Move.objects.get(id=pk)
            if move.updated_at > timezone.now() - datetime.timedelta(hours=6):
                return Response(MoveSerializer(move).data)
        return Response({})


class SpotViewSet(viewsets.ModelViewSet):
    queryset = Spot.objects.all()
    serializer_class = SpotSerializer
