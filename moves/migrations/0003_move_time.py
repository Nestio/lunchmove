# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('moves', '0002_move_uuid'),
    ]

    operations = [
        migrations.AddField(
            model_name='move',
            name='time',
            field=models.DateField(null=True, blank=True),
        ),
    ]
