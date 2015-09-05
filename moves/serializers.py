from .models import Move, Spot
from rest_framework import serializers

class MoveSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Move
        fields = ('spot', 'updated_at', 'user')


class SpotSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Spot
        fields = ('name')
