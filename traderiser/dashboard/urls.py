from django.urls import path
from .views import DashboardView, DepositView, WithdrawalView, ResetDemoView

urlpatterns = [
    path('', DashboardView.as_view(), name='dashboard'),
    path('deposit/', DepositView.as_view(), name='deposit'),
    path('withdraw/', WithdrawalView.as_view(), name='withdraw'),
    path('reset-demo/', ResetDemoView.as_view(), name='reset_demo'),
]