import datetime
import requests
from django.db import models
from django.utils import timezone
from django.conf import settings

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

    def save(self, *args, **kwargs):
        root = 'https://api.hipchat.com/v2/room/%s/notification' % settings.HIPCHAT_ROOM_ID
        params = {'auth_token': settings.HIPCHAT_AUTH_TOKEN}
        data = {'color': 'green', 'message': self.__unicode__(), 'notify': True, 'message_format': 'text'}
        r = requests.post(root, params=params, data=data)s
        super(Move, self).save(*args, **kwargs)

    def __unicode__(self):
        return u'%s is going to %s' % (self.user, self.spot.name)
