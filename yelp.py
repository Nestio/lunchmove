import requests
from requests_oauthlib import OAuth1
from pprint import pprint

"""
Each request must contain the following OAuth protocol parameters:

oauth_consumer_key  Your OAuth consumer key (from Manage API Access).
oauth_token The access token obtained (from Manage API Access).
oauth_signature_method  hmac-sha1
oauth_signature The generated request signature, signed with the oauth_token_secret obtained (from Manage API Access).
oauth_timestamp Timestamp for the request in seconds since the Unix epoch.
oauth_nonce A unique string randomly generated per request.
"""

def main():
    oauth_consumer_key = "LGLt4ze9XgD-DKN-TheCpw"
    oauth_consumer_secret =  "Mo6bTkDy7Vao78vQq0JOGKsPooM"
    oauth_token = "4jMtElVu1qID6uej_tZmxHy2nk92T3Gm"
    oauth_token_secret = "VUBC42KuuUwrD37co4xLZzefHjY"

    auth = OAuth1(
        oauth_consumer_key,
        oauth_consumer_secret,
        oauth_token, 
        oauth_token_secret
    )
    url = "https://api.yelp.com/v2/search"
    params = {
        'term': 'food',
        'location': 'New York',
    }
    response = requests.get(url, auth=auth, params=params)
    pprint(response.json())

if __name__ == '__main__':
    main()
