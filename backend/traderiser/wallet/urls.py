# wallet/urls.py
from django.urls import path
from .views import (
    WalletListView, MpesaNumberView, DepositView, WithdrawalOTPView,
    VerifyWithdrawalOTPView, TransactionListView, MpesaCallbackView
)

urlpatterns = [
    path('wallets/', WalletListView.as_view(), name='wallet_list'),
    path('mpesa-number/', MpesaNumberView.as_view(), name='mpesa_number'),
    path('deposit/', DepositView.as_view(), name='deposit'),
    path('withdraw/otp/', WithdrawalOTPView.as_view(), name='withdraw_otp'),
    path('withdraw/verify/', VerifyWithdrawalOTPView.as_view(), name='verify_withdrawal'),
    path('transactions/', TransactionListView.as_view(), name='transaction_list'),
    path('callback/', MpesaCallbackView.as_view(), name='mpesa_callback'),
]