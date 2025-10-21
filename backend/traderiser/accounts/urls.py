# urls.py
from django.urls import path
from .views import SignupView, LoginView, SashiToggleView, AccountDetailView, ResetDemoBalanceView, CreateAdditionalAccountView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('sashi/toggle/', SashiToggleView.as_view(), name='sashi_toggle'),
    path('account/', AccountDetailView.as_view(), name='account_detail'),
    path('demo/reset-balance/', ResetDemoBalanceView.as_view(), name='reset_demo_balance'),
    path('account/create/', CreateAdditionalAccountView.as_view(), name='create_additional_account'),
]