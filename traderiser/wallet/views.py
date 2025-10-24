import random
import string
import json
import logging
from decimal import Decimal
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Wallet, WalletTransaction, MpesaNumber, Currency, ExchangeRate, OTPCode
from .serializers import (
    WalletSerializer, WalletTransactionSerializer, MpesaNumberSerializer,
    OTPRequestSerializer, OTPVerifySerializer
)
from accounts.models import Account
from dashboard.models import Transaction
from .payment import PaymentClient

logger = logging.getLogger('wallet')
ADMIN_EMAIL = "admin@traderiser.com"

class WalletListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        wallets = Wallet.objects.filter(account__user=request.user)
        serializer = WalletSerializer(wallets, many=True)
        return Response({'wallets': serializer.data})

class MpesaNumberView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        try:
            mpesa = MpesaNumber.objects.get(user=request.user)
            return Response(MpesaNumberSerializer(mpesa).data)
        except MpesaNumber.DoesNotExist:
            return Response({'error': 'M-Pesa number not set'}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        serializer = MpesaNumberSerializer(data=request.data)
        if serializer.is_valid():
            mpesa, _ = MpesaNumber.objects.update_or_create(
                user=request.user,
                defaults={'phone_number': serializer.validated_data['phone_number']}
            )
            return Response(MpesaNumberSerializer(mpesa).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DepositView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        account_type = data.get('account_type', 'standard')
        amount = data.get('amount')
        currency_code = data.get('currency')
        mpesa_phone = data.get('mpesa_phone')

        # Validate inputs
        if not all([amount, currency_code, mpesa_phone]):
            return Response({'error': 'Amount, currency, and phone required'}, status=status.HTTP_400_BAD_REQUEST)
        if account_type not in [choice[0] for choice in Account.ACCOUNT_TYPES]:
            return Response({'error': 'Invalid account type'}, status=status.HTTP_400_BAD_REQUEST)
        if currency_code != 'KSH':
            return Response({'error': 'Deposits must be in KSH via M-Pesa'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(amount)
            if amount <= 0:
                raise ValueError('Amount must be positive')
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get specific account by type
            account = Account.objects.get(user=request.user, account_type=account_type)
            if account.account_type == 'demo':
                return Response({'error': 'Deposits not allowed on demo accounts'}, status=status.HTTP_400_BAD_REQUEST)

            # Ensure currencies exist
            try:
                ksh = Currency.objects.get(code='KSH')
            except Currency.DoesNotExist:
                logger.warning("KSH currency not found, creating default")
                ksh = Currency.objects.create(code='KSH', name='Kenyan Shilling', symbol='KSh', is_fiat=True)

            try:
                usd = Currency.objects.get(code='USD')
            except Currency.DoesNotExist:
                logger.warning("USD currency not found, creating default")
                usd = Currency.objects.create(code='USD', name='US Dollar', symbol='$', is_fiat=True)

            # Get or create the main USD wallet for this account
            wallet, created = Wallet.objects.get_or_create(
                account=account,
                wallet_type='main',
                currency=usd,
                defaults={'balance': Decimal('0.00')}
            )

            # Get exchange rate
            try:
                rate = ExchangeRate.objects.get(base_currency=ksh, target_currency=usd)
            except ExchangeRate.DoesNotExist:
                logger.warning("KSH to USD exchange rate not found, creating default")
                rate = ExchangeRate.objects.create(
                    base_currency=ksh,
                    target_currency=usd,
                    live_rate=Decimal('0.007752'),  # Example: 1 KSH = 0.007752 USD (as of Oct 2025)
                    admin_withdrawal_rate=Decimal('0.007500')  # Slightly lower for withdrawals
                )

            converted = amount * rate.live_rate  # Use multiplication for clarity (1/rate.live_rate was division)

            with transaction.atomic():
                trans = WalletTransaction.objects.create(
                    wallet=wallet,
                    transaction_type='deposit',
                    amount=amount,
                    currency=ksh,
                    target_currency=usd,
                    converted_amount=converted,
                    exchange_rate_used=rate.live_rate,
                    mpesa_phone=mpesa_phone,
                    description='M-Pesa Deposit Pending'
                )

                client = PaymentClient()
                result = client.initiate_stk_push(
                    phone_number=mpesa_phone,
                    amount=amount,
                    transaction_id=trans.reference_id
                )

                if result.get('ResponseCode') == '0':
                    checkout_id = result.get('CheckoutRequestID')
                    trans.checkout_request_id = checkout_id
                    trans.save()
                    return Response({
                        'message': 'Deposit initiated, check your phone for STK push.',
                        'transaction_id': trans.id,
                        'reference_id': trans.reference_id,
                        'checkout_request_id': checkout_id
                    })
                else:
                    trans.status = 'failed'
                    trans.description += f' | STK Push Failed: {result.get("error", "Unknown error")}'
                    trans.save()
                    logger.error(f"STK Push failed for transaction {trans.reference_id}: {result.get('error')}")
                    return Response({'error': result.get('error', 'Failed to initiate deposit')}, status=status.HTTP_400_BAD_REQUEST)

        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        except Currency.DoesNotExist as e:
            logger.error(f"Currency error: {str(e)}")
            return Response({'error': 'Required currency (KSH or USD) not found'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except ExchangeRate.DoesNotExist as e:
            logger.error(f"Exchange rate error: {str(e)}")
            return Response({'error': 'KSH to USD exchange rate not found'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Deposit error: {str(e)}")
            return Response({'error': 'Server error during deposit processing'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class WithdrawalOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    # ... (rest of the views unchanged)
    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = serializer.validated_data['amount']
            wallet_type = serializer.validated_data['wallet_type']
            wallet = Wallet.objects.get(
                account__user=request.user,
                wallet_type=wallet_type,
                currency__code='USD'
            )
            if wallet.balance < amount:
                return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                mpesa_number = MpesaNumber.objects.get(user=request.user)
            except MpesaNumber.DoesNotExist:
                return Response({'error': 'M-Pesa number not set'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                trans = WalletTransaction.objects.create(
                    wallet=wallet,
                    transaction_type='withdrawal',
                    amount=amount,
                    currency=wallet.currency,
                    mpesa_phone=mpesa_number.phone_number,
                    description='Withdrawal Requested'
                )
                otp = OTPCode.objects.create(
                    user=request.user,
                    purpose='withdrawal',
                    transaction=trans
                )
                send_mail(
                    "Withdrawal OTP",
                    f"Hi {request.user.username},\n\nYour OTP for withdrawal of ${amount} is {otp.code}.\nRef: {trans.reference_id}",
                    settings.DEFAULT_FROM_EMAIL,
                    [request.user.email]
                )
                return Response({
                    'message': 'OTP sent to your email',
                    'transaction_id': trans.id,
                    'reference_id': trans.reference_id
                })

        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Withdrawal OTP error: {e}")
            return Response({'error': 'Server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyWithdrawalOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp = OTPCode.objects.get(
                user=request.user,
                code=serializer.validated_data['code'],
                purpose='withdrawal',
                is_used=False
            )
            if otp.is_expired():
                otp.is_used = True
                otp.save()
                return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)

            trans = otp.transaction
            if trans.id != serializer.validated_data['transaction_id']:
                return Response({'error': 'Invalid transaction ID'}, status=status.HTTP_400_BAD_REQUEST)
            if trans.status != 'pending':
                return Response({'error': 'Transaction already processed'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                otp.is_used = True
                otp.save()
                trans.status = 'completed'
                trans.completed_at = timezone.now()
                trans.save()

                wallet = trans.wallet
                wallet.balance -= trans.amount
                wallet.save()

                Transaction.objects.create(
                    account=wallet.account,
                    amount=-trans.amount,
                    transaction_type='withdrawal',
                    description=f"OTP verified: {trans.reference_id}"
                )

                send_mail(
                    "Withdrawal Successful",
                    f"Hi {request.user.username},\n\n${trans.amount} USD withdrawn.\nRef: {trans.reference_id}",
                    settings.DEFAULT_FROM_EMAIL, [request.user.email]
                )
                send_mail(
                    "Withdrawal Completed (User Verified)",
                    f"User: {request.user.username}\nAmount: ${trans.amount}\nPhone: {trans.mpesa_phone}\nRef: {trans.reference_id}\nNow pay via M-Pesa.",
                    settings.DEFAULT_FROM_EMAIL, [ADMIN_EMAIL]
                )

            return Response({'message': 'Withdrawal completed. Awaiting admin payment.'})

        except OTPCode.DoesNotExist:
            return Response({'error': 'Invalid or used OTP'}, status=status.HTTP_400_BAD_REQUEST)
        except WalletTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"OTP verify error: {e}")
            return Response({'error': 'Server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransactionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        txs = WalletTransaction.objects.filter(wallet__account__user=request.user)
        serializer = WalletTransactionSerializer(txs, many=True)
        return Response({'transactions': serializer.data})

class MpesaCallbackView(APIView):
    permission_classes = []
    def post(self, request):
        try:
            data = json.loads(request.body)
            stk = data['Body']['stkCallback']
            result_code = stk['ResultCode']
            checkout_id = stk['CheckoutRequestID']
            trans = WalletTransaction.objects.get(checkout_request_id=checkout_id)

            with transaction.atomic():
                if result_code == 0:
                    meta = stk['CallbackMetadata']['Item']
                    amount = Decimal(next(i['Value'] for i in meta if i['Name'] == 'Amount'))
                    receipt = next(i['Value'] for i in meta if i['Name'] == 'MpesaReceiptNumber')
                    trans.description += f' | Receipt: {receipt}'
                    trans.status = 'completed'
                    trans.completed_at = timezone.now()
                    trans.save()

                    wallet = trans.wallet
                    wallet.balance += trans.converted_amount
                    wallet.save()

                    Transaction.objects.create(
                        account=wallet.account,
                        amount=trans.converted_amount,
                        transaction_type='deposit',
                        description=f"Approved: {trans.reference_id}"
                    )
                    user = trans.wallet.account.user
                    send_mail(
                        "Deposit Approved!",
                        f"Hi {user.username},\n\nYour deposit of KSh {trans.amount} has been approved.\n${trans.converted_amount} USD credited.\nRef: {trans.reference_id}",
                        settings.DEFAULT_FROM_EMAIL, [user.email]
                    )
                    send_mail(
                        "Deposit Completed (Auto)",
                        f"User: {user.username}\nAmount: KSh {trans.amount} (${trans.converted_amount})\nRef: {trans.reference_id}",
                        settings.DEFAULT_FROM_EMAIL, [ADMIN_EMAIL]
                    )
                else:
                    trans.status = 'failed'
                    trans.description += f' | Failed: {stk["ResultDesc"]}'
                    trans.save()
                    user = trans.wallet.account.user
                    send_mail(
                        "Deposit Failed",
                        f"Hi {user.username},\n\nYour deposit of KSh {trans.amount} failed: {stk['ResultDesc']}.\nRef: {trans.reference_id}",
                        settings.DEFAULT_FROM_EMAIL, [user.email]
                    )
        except Exception as e:
            logger.error(f"Callback error: {e}")
        return JsonResponse({'ResultCode': 0})