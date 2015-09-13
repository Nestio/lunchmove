import datetime
from django.db import models
from django.utils import timezone

class Spot(models.Model):
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __unicode__(self):
        return self.name


class MoveManager(models.Manager):
    def recent(self):
        start = timezone.now() - datetime.timedelta(hours=6)
        return self.filter(updated_at__gte=start).order_by('-updated_at')

class Move(models.Model):
    objects = MoveManager()

    user = models.CharField(max_length=50)
    spot = models.ForeignKey(Spot)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    uuid = models.UUIDField(blank=True, null=True)

    def __unicode__(self):
        return u'%s is going to %s' % (self.user, self.spot.name)
