from django.db import models
import datetime

class Spot(models.Model):
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class MoveManager(models.Manager):
    def recent(self):
        start = datetime.datetime.now() - datetime.timedelta(hours=6)
        return self.filter(updated_at__gte=start).order_by('-updated_at')

class Move(models.Model):
    objects = MoveManager()
    user = models.CharField(max_length=50)
    spot = models.ForeignKey(Spot)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
