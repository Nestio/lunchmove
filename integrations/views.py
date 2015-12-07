import requests

from django.shortcuts import render
from django.http import HttpResponse
from django.conf import settings

from integrations.yelp import YelpAPI

def post_to_slack(message):
    root = settings.SLACK_URL
    data = {
        "channel": settings.SLACK_ROOM,
        "username": "lunchmove",
        "text": message,
        "icon_emoji": ":fork_and_knife:"
    }
    r = requests.post(root, json=data)
    print 'response from slack: %s' % r.text

def yelp_suggestion(request):
    THE_TOKEN = 'D98hlGNDpozoYKeZbrKfAbCe' # official token from slack for confirming the request came from slack and not a fake
    token = request.GET.get('token')
    if token != THE_TOKEN:
        return HttpResponse('bogus dude', status=403)

    # parse the request for 'text' which is the search term to submit to yelp
    search_term = request.GET.get('text')
    params = {
        'term': search_term
    }

    yelp = YelpAPI()
    yelp_response = yelp.query(params)
    if yelp_response.status_code == 200:
        # TODO: this is fragile. make it more better
        recommendation_url = yelp_response.json()['businesses'][0]['url']
        post_to_slack(recommendation_url)
        return HttpResponse(recommendation_url, status=200)

    return HttpResponse(status=400)
