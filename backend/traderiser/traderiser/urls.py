# traderiser/traderiser/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/trading/', include('trading.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/wallet/', include('wallet.urls')),
]