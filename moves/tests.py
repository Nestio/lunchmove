import pdb
import json
import datetime
from django.utils import timezone
from django.test import override_settings
from django.test import TestCase
from .models import Move, Spot

# Create your tests here.
class MoveTestCase(TestCase):
    """
    tests functionality in the Move model class
    """
    def test_move_saved_with_no_time_defaults_to_now(self):
        spot = Spot.objects.create(name='somewhere over the rainbow')
        move = Move(user="some dude", spot=spot)
        move.save(broadcast=False)
        
        time_diff = timezone.now() - move.time
        self.assertAlmostEqual(time_diff.seconds, 0)

class IndexTests(TestCase):
    def test_uuid_is_set_after_navigating_to_the_index_page(self):
        self.assertNotIn('user_uuid', self.client.session)
        self.client.get('/')
        self.assertIn('user_uuid', self.client.session)

    def test_user_uuid_is_not_reset_upon_navigation_to_index_page_if_set(self):
        self.client.get('/')
        uuid = self.client.session.get('user_uuid')
        self.assertTrue(bool(uuid))
        self.client.get('/')
        self.assertEqual(self.client.session.get('user_uuid'), uuid)

    @override_settings(DEBUG=True)
    def test_bootstrap_model_on_page_if_model_with_uuid_with_past_six_hours_exists(self):
        self.client.get('/')
        uuid = self.client.session.get('user_uuid')
        self.client.post('/json/spots/', { 'name': 'The Spot' })
        self.client.post('/json/moves/', {
            'user':'user',
            'spot': Spot.objects.first().id,
            'time': timezone.now() - datetime.timedelta(hours=3)
        })
        recent_move = json.loads(self.client.get('/').context['recent_move'])
        self.assertEqual(uuid, recent_move['uuid'])
        self.assertIn('time',recent_move)
        self.assertIn('id', recent_move)
        self.assertIn('spot', recent_move)
        self.assertIn('user', recent_move)

    @override_settings(DEBUG=True)
    def test_users_name_bootrapped_if_model_beyond_six_hours_ago_exists(self):
        self.client.get('/')
        self.client.post('/json/spots/', { 'name': 'The Spot' })
        self.client.post('/json/moves/', {
            'user':'user',
            'spot': Spot.objects.first().id,
            'time': timezone.now() - datetime.timedelta(hours=9)
        })
        recent_move = json.loads(self.client.get('/').context['recent_move'])
        self.assertIn('user', recent_move)
        self.assertNotIn('time', recent_move)
        self.assertNotIn('id', recent_move)
        self.assertNotIn('spot', recent_move)
        self.assertNotIn('uuid', recent_move)

    def test_empty_model_bootstrapped_if_no_model_matches(self):
        recent_move = json.loads(self.client.get('/').context['recent_move'])
        self.assertNotIn('user', recent_move)
        self.assertNotIn('time', recent_move)
        self.assertNotIn('id', recent_move)
        self.assertNotIn('spot', recent_move)
        self.assertNotIn('uuid', recent_move)

class MoveViewSetTests(TestCase):
    @override_settings(DEBUG=True)
    def test_move_uuid_matches_user_uuid(self):
        self.client.get('/')
        uuid = self.client.session.get('user_uuid')
        self.client.post('/json/spots/', { 'name': 'The Spot' })
        self.client.post('/json/moves/', {
            'user':'User',
            'spot': Spot.objects.first().id,
            'time': timezone.now()
        })
        move = json.loads(self.client.get('/json/moves/').content)['results'][0]
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
        request_time = datetime.datetime.now()
        for move in moves:
            move_time = datetime.datetime.strptime(move['time'], "%Y-%m-%dT%H:%M:%S.%fZ")
            if move_time < datetime.datetime.now():
                difference = request_time - move_time
                seconds_in_hour = 60 ** 2
                self.assertTrue(difference.seconds/seconds_in_hour <= 6)
