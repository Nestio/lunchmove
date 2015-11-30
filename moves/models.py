import datetime
import requests
import json
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
        return self.filter(time__gte=start).order_by('-time')

class Move(models.Model):
    objects = MoveManager()

    user = models.CharField(max_length=50)
    spot = models.ForeignKey(Spot)
    time = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    uuid = models.UUIDField(blank=True, null=True)

    def save(self, *args, **kwargs):
        super(Move, self).save(*args, **kwargs)
        self.post_to_slack()

    def post_to_hipchat(self):
        root = 'https://api.hipchat.com/v2/room/%s/notification' % settings.HIPCHAT_ROOM_ID
        params = {'auth_token': settings.HIPCHAT_AUTH_TOKEN}
        data = {'color': 'green', 'message': self.__unicode__(), 'notify': True, 'message_format': 'text'}
        r = requests.post(root, params=params, data=data)

    def post_to_slack(self):
        root = settings.SLACK_URL
        data = {
            "channel": settings.SLACK_ROOM,
            "username": "lunchmove",
            "text": self.__unicode__(),
            "icon_emoji": ":fork_and_knife:"
        }
        r = requests.post(root, json=data)
        print 'response from slack: %s' % r.text

    def __unicode__(self):
        link = u'%s/%s/join|Join>' % ('<http://lunchmove.info/move', self.id)
        root = u'%s is going to eat %s' % (self.user, self.spot.name)
        if self.time:
            root = '%s at %s. %s' % (root, self.time.strftime('%-I:%M '), link)
        return root
