from .models import Move, Spot
from rest_framework import serializers

class MoveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Move
        fields = ('spot', 'updated_at', 'user', 'id')


class SpotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spot
        fields = ('name', 'id')
