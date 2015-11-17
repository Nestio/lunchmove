#!/bin/bash 

echo "I can haz provisions?"

PROJECT_PATH=/vagrant
VAGRANT_USER_HOME=/home/vagrant

# first things first, update apt so we can install the up-to-date versions of everything
echo "Updating Package Manager"
sudo apt-get update

# now install all the software packages and their dependencies
echo "Installing Packages"

# install postgres
sudo apt-get -y install postgresql postgresql-contrib

# install and update python-dev, so we are sure we can compile c extensions for python
# and install pip because, yeah
sudo apt-get -y install python-dev python-pip

# then install c libs dependencies used that will be used by other stuff, mostly python crypto packages in this case
sudo apt-get -y install libpq-dev libffi-dev

# finally install python dependencies
sudo pip install -r $PROJECT_PATH/requirements.txt

# set environment variables
echo "Set Environment Variables"
source $PROJECT_PATH/setup/private/set_env.sh
# and make sure they stay set on new shell tabs
cat $PROJECT_PATH/setup/private/set_env.sh >> $VAGRANT_USER_HOME/.bashrc
source $VAGRANT_USER_HOME/.bashrc

# create database user and the database itself
# TODO: don't hardcode this, but for now its an expedient
# this is a little fucked up right now because apparently can't create databases from inside a function
sudo -u postgres psql -f $PROJECT_PATH/setup/private/create_db.sql

# run migrations
python $PROJECT_PATH/manage.py migrate
