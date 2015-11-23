import pdb
from django.test import TestCase
from .models import Move

# Create your tests here.
class IndexTests(TestCase):

    def test_user_uuid_is_set_if_not_set(self):
        self.client.get('/')
        self.assertTrue(self.client.session.get('user_uuid'))
