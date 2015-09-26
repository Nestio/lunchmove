# Lunchmove

### Setting up the environment

Make sure you have Virtualenv installed on your local machine.

Create the virtualenv:

    $ virtualenv lunchmove

Set the following environment variables in the `lunchmove/bin/activate` script. Some of the secret variables you should get from me:

    export DATABASE_URL=postgres://:@localhost/lunchmove_dev1
    export DEBUG=True
    export SECRET_KEY=[generate a Django Secret key]
    export HIPCHAT_ROOM_ID=1934389
    export HIPCHAT_AUTH_TOKEN=[get this from Ben]
    export SLACK_ROOM=test
    export SLACK_URL=[get this from Ben]

The Slack webhook endpoint is also set as an environment variable

Then run the activation script:

    $ source lunchmove/bin/activate

Install the dependencies:

    $ pip install -r requirements.txt

Create a database and migrate it:
    $  psql
    $  CREATE DATABASE lunchmove_dev1;

Migrate your database, create a superuser and run the server:

    $ python manage.py migrate
    $ python manage.py createsuperuser
    $ python manage.py runserver

### Front end dependencies and development:

The front end assets are located in the public/assets folder. Packages are managed via NPM and Bower. To install the front end assets, navigate to the folder and run the following commands:
   $app npm install
   $app npm run setup

During development, to recompile the javascript and stylesheets:
   $app gulp build

The compiled javascript and stylesheets are checked into repository, so if you make any changes to them, make sure they've been recompiled before pushing.
