from django.conf.urls import url

from integrations.views import yelp_suggestion


urlpatterns = [
    url(r'^suggestion/?$', yelp_suggestion, name='yelp_suggestion'),
]
