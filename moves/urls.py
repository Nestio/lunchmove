from django.conf.urls import include, url
from rest_framework import routers
from .views import MoveViewSet, SpotViewSet

router = routers.DefaultRouter()
router.register(r'moves', MoveViewSet)
router.register(r'spots', SpotViewSet)

urlpatterns = [
    url(r'^', include(router.urls)),
]
