#!/bin/bash 

echo "I can haz provisions?"

PROJECT_PATH=/vagrant

# first things first, update apt so we can install the up-to-date versions of everything
echo "Updating Package Manager"
sudo apt-get update

# then install postgres
echo "Installing PostgreSQL"
sudo apt-get install postgresql postgresql-contrib

# now install all the software packages and their depdencies
echo "Installing Packages"

# install and update python-dev, so we are sure we can compile c extensions for python
sudo apt-get install python-dev

# then install c libs dependencies used that will be used by other stuff, mostly python crypto packages in this case
sudo apt-get install libpq-dev libffi-dev

# finally install python dependencies
sudo pip install -r $PROJECT_PATH/requirements.txt

# set environment variables
echo "Set Environment Variables"
source $PROJECT_PATH/setup/set_env.sh

# create database user and the database itself
# TODO: don't hardcode this, but for now its an expedient
sudo -u postgres psql -f setup/create_db.sql

# syncdb and migrate
python $PROJECT_PATH/manage.py syncdb
python $PROJECT_PATH/manage.py migrate
