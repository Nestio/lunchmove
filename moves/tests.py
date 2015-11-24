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

    @override_settings(DEBUG=True)
    def test_moves_index_route_only_displays_moves_from_the_last_six_hours(self):
        spot = Spot.objects.create(name='The Spot')
        time_changes = [-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10]
        for el in time_changes:
            time = timezone.now() + datetime.timedelta(hours=el)
            username = 'user' + str(el)
            Move.objects.create(user=username, spot=spot, time=time)

        self.client.get('/')
        moves = json.loads(self.client.get('/json/moves/').content)['results']
        for move in moves:
            move_time = datetime.datetime.strptime(move['time'], "%Y-%m-%dT%H:%M:%S.%fZ")
            if move_time > datetime.datetime.now():
                difference = move_time - datetime.datetime.now()
                self.assertFalse(difference.seconds/3600 > 6)
