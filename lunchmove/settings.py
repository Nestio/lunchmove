"""
Django settings for lunchmove project.

Generated by 'django-admin startproject' using Django 1.8.4.

For more information on this file, see
https://docs.djangoproject.com/en/1.8/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.8/ref/settings/
"""
import dj_database_url

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.8/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', False)
ENV = 'dev' if DEBUG else 'prod'


ALLOWED_HOSTS = ['.lunchmove.info', 'lunchmove.herokuapp.com']


# Application definition

INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'moves'
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
)

ROOT_URLCONF = 'lunchmove.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'lunchmove.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.8/ref/settings/#databases

dev_db = {
    'ENGINE': 'django.db.backends.postgresql_psycopg2',
    'NAME': 'lunchmove_dev1',
    'USER': 'lunchmove',
    'PASSWORD': 'lunchmove',
    'HOST': '127.0.0.1',
    'PORT': '5432',
}
prod_db = dj_database_url.config(default=os.environ['DATABASE_URL'])

DATABASES = {
    'default': dev_db if ENV == 'dev' else prod_db
}

# Internationalization
# https://docs.djangoproject.com/en/1.8/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_ROOT = 'staticfiles'
STATIC_URL = '/static/'

STATICFILES_DIRS = (
    BASE_DIR+'/../static/',
)

STATICFILES_STORAGE = 'whitenoise.django.GzipManifestStaticFilesStorage'

REST_FRAMEWORK = {
    'PAGE_SIZE': 1000
}

HIPCHAT_ROOM_ID = os.environ['HIPCHAT_ROOM_ID']
HIPCHAT_AUTH_TOKEN = os.environ['HIPCHAT_AUTH_TOKEN']
SLACK_URL = os.environ['SLACK_URL']
SLACK_ROOM = os.environ['SLACK_ROOM']
BROADCAST_TO_SLACK = False

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'ERROR'),
        },
    },
}
