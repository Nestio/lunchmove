import datetime
import uuid
import json
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
    uuid = request.session.get('user_uuid') || str(uuid.uuid4())
    try:
        move = Move.objects.get(uuid=uuid, updated_at__gte=timezone.now() - datetime.timedelta(hours=6))
        move = MoveSerializer(move).data
    except Move.DoesNotExist:
        move = {}
    return render(request, 'moves/index.html', {'recent_move': json.dumps(move)})

class MoveViewSet(viewsets.ModelViewSet):
    queryset = Move.objects.recent()
    serializer_class = MoveSerializer

    def create(self, request):
        print request.session['uuid']
        data = request.data.copy().update({'uuid': request.session['uuid'])})
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class SpotViewSet(viewsets.ModelViewSet):
    queryset = Spot.objects.all()
    serializer_class = SpotSerializer
