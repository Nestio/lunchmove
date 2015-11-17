# Lunchmove

### Setting up the environment and getting started

This is managed through Vagrant cuz its more awesome. Why have just a virtualenv when you can have a whole virtual machine? yeah, exactly. Here's what you need to do 

1. Install [VirtualBox](https://www.virtualbox.org/wiki/Downloads) 
2. Install [Vagrant](https://www.vagrantup.com/)
3. clone the repo to your development machine
    1. IMPORTANT: you will need to copy a couple of files into your local filesystem manually because they contain sensitive tokens and we don't want that in a public git repo. ask Dan or Ben or some other person who spends all day on a computer for these. 
    2. copy `create_db.sql` into `lunchmove/setup/private/create_db.sql`
    3. copy 'set_env.sh' into `lunchmove/setup/private/set_env.sh`
4. `host$ vagrant up`
5. `host$ vagrant ssh`
6. `vm$ cd /vagrant`
7. `vm$ python manage.py runserver 0.0.0.0:8080` 
8. in your browser you can now visit localhost:8080 and have you some lunchmoves
9. login to slack and check out the lunchmove private channel, which is where the dev environment posts messages to

### Front end dependencies and development:

The front end assets are located in the public/assets folder. Packages are managed via NPM. To install the front end assets, navigate to the folder and run the following commands:

    $ cd static/app
    $ npm install
    $ npm run setup

During development, to recompile the javascript and stylesheets:

    $ gulp build

The compiled javascript and stylesheets are checked into repository, so if you make any changes to them, make sure they've been recompiled before pushing.

### To deploy

1. make a Heroku account
2. download the [heroku toolbelt](https://toolbelt.heroku.com/) and login on the command-line to your heroku account
3. link your local git repo to the heroku app like this `heroku git:remote -a lunchmove`
4. `git push heroku master`
