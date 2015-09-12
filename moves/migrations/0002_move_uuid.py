# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('moves', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='move',
            name='uuid',
            field=models.UUIDField(null=True, blank=True),
        ),
    ]
