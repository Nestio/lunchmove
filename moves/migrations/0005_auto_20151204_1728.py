# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import datetime


class Migration(migrations.Migration):

    dependencies = [
        ('moves', '0004_auto_20150920_1726'),
    ]

    operations = [
        migrations.AlterField(
            model_name='move',
            name='time',
            field=models.DateTimeField(default=datetime.datetime.now, null=True, blank=True),
        ),
    ]
