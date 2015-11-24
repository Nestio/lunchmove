import pdb
import json
import datetime
from django.utils import timezone
from django.test import override_settings
from django.test import TestCase
from .models import Move, Spot

# Create your tests here.
class IndexTests(TestCase):

    def test_uuid_is_set_after_navigating_to_the_index_page(self):
        self.assertIsNone(self.client.session.get('user_uuid'))
        self.client.get('/')
        self.assertTrue(bool(self.client.session.get('user_uuid')))

    def test_user_uuid_is_not_reset_upon_navigation_to_index_page_if_set(self):
        self.client.get('/')
        uuid = self.client.session.get('user_uuid')
        self.assertTrue(bool(uuid))
        self.client.get('/')
        self.assertEqual(self.client.session.get('user_uuid'), uuid)

class MoveViewSetTests(TestCase):
    @override_settings(DEBUG=True)
    def test_move_uuid_matches_user_uuid(self):
        self.client.get('/')
        uuid = self.client.session.get('user_uuid')
        self.client.post('/json/spots/', { 'name': 'The Spot' })
        spot = json.loads(self.client.get('/json/spots/').content)['results'][0]
        self.assertEqual(spot['id'], 1)
        self.client.post('/json/moves/', {
            'user':'User',
            'spot': 1,
            'time': timezone.now()
        })
        move = json.loads(self.client.get('/json/moves/').content)['results'][0]
        self.assertEqual(move['id'], 1)
        self.assertEqual(move['uuid'], uuid)
