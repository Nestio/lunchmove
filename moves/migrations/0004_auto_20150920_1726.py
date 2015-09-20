# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('moves', '0003_move_time'),
    ]

    operations = [
        migrations.AlterField(
            model_name='move',
            name='time',
            field=models.DateTimeField(null=True, blank=True),
        ),
    ]
