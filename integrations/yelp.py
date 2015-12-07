import requests
from requests_oauthlib import OAuth1

class YelpAPI(object):
    OAUTH_CONSUMER_KEY = "LGLt4ze9XgD-DKN-TheCpw"
    OAUTH_CONSUMER_SECRET =  "Mo6bTkDy7Vao78vQq0JOGKsPooM"
    OAUTH_TOKEN = "4jMtElVu1qID6uej_tZmxHy2nk92T3Gm"
    OAUTH_TOKEN_SECRET = "VUBC42KuuUwrD37co4xLZzefHjY"

    SEARCH_ENDPOINT_URL = "https://api.yelp.com/v2/search"

    # list of the parameters the yelp search API will accept
    # submiting a query with parameters not in this list will cause an error
    QUERY_PARAMS = (
        'term',
        'limit',
        'offset',
        'sort',
        'category_filter',
        'radius_filter',
    )

    def get_auth(self):
        auth = OAuth1(
            self.OAUTH_CONSUMER_KEY,
            self.OAUTH_CONSUMER_SECRET,
            self.OAUTH_TOKEN, 
            self.OAUTH_TOKEN_SECRET
        )
        return auth

    def get_url(self):
        return self.SEARCH_ENDPOINT_URL

    def get_params(self, params):
        DEFAULT_PARAMS = {
            'term': 'lunch',
            'location': '10010', # zipcode
            'limit': 3,
            'category_filter': 'food,restaurants',
            'radius_filter': 1000, # 1000 meter radius
            'sort': 2 # 2 is the code for sort by highest rated
        }
        if params is not None:
            # remove unsupported fields
            for key in params.keys():
                if key not in self.QUERY_PARAMS:
                    del params[key]

        query_params = DEFAULT_PARAMS.update(params)
        return query_params


    def query(self, params=None):
        """
        https://www.yelp.com/developers/documentation/v2/search_api

        params should be a dictionary of parameters allowed by the search endpoint as specified at the documentation link above
        """
        response = requests.get(self.get_url(), auth=self.get_auth(), params=self.get_params(params))
        return response
