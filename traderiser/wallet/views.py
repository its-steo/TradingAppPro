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

def generate_reference_id(length: int = 12) -> str:
    """Generate a random alphanumeric reference ID."""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

logger = logging.getLogger('wallet')
ADMIN_EMAIL = "steomustadd@gmail.com"

def generate_otp(length: int = 6) -> str:
    """
    Generate a numeric OTP of given length.
    Returns a string composed of digits.
    """
    return ''.join(random.choices(string.digits, k=length))

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

        if not all([amount, currency_code, mpesa_phone]):
            return Response({'error': 'Amount, currency, and phone required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(amount)
            if amount <= 0:
                return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)

            account = Account.objects.get(user=request.user, account_type=account_type)
            if account.account_type == 'demo':
                return Response({'error': 'Deposits not allowed on demo accounts'}, status=status.HTTP_400_BAD_REQUEST)

            ksh = Currency.objects.get(code='KSH')
            usd = Currency.objects.get(code='USD')

            if currency_code != 'KSH':
                return Response({'error': 'Deposits must be in KSH'}, status=status.HTTP_400_BAD_REQUEST)

            exchange_rate = ExchangeRate.objects.get(base_currency=ksh, target_currency=usd).live_rate
            converted_amount = amount * exchange_rate

            wallet = Wallet.objects.get(account=account, wallet_type='main', currency=usd)

            trans = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='deposit',
                amount=amount,
                currency=ksh,
                target_currency=usd,
                converted_amount=converted_amount,
                exchange_rate_used=exchange_rate,
                status='pending',
                reference_id=generate_reference_id(),
                description='Deposit request',
                mpesa_phone=mpesa_phone
            )

            client = PaymentClient()
            result = client.initiate_stk_push(mpesa_phone, amount, trans.reference_id)
            if result['ResponseCode'] != '0':
                trans.status = 'failed'
                trans.description += f" | Failed: {result.get('error', 'Unknown error')}"
                trans.save()
                return Response({'error': result.get('error', 'Payment initiation failed')}, status=status.HTTP_400_BAD_REQUEST)

            trans.checkout_request_id = result['CheckoutRequestID']
            trans.save()

            return Response({
                'transaction_id': trans.id,
                'reference_id': trans.reference_id,
                'message': 'STK Push initiated. Please check your phone to complete the payment.'
            })

        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found'}, status=status.HTTP_404_NOT_FOUND)
        except Currency.DoesNotExist:
            return Response({'error': 'Currency not found'}, status=status.HTTP_400_BAD_REQUEST)
        except ExchangeRate.DoesNotExist:
            return Response({'error': 'Exchange rate not found'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Deposit error: {str(e)}")
            return Response({'error': 'Internal error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class WithdrawalOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        amount = serializer.validated_data['amount']
        wallet_type = serializer.validated_data['wallet_type']
        account_type = serializer.validated_data['account_type']

        if amount <= 0:
            return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account = Account.objects.get(user=request.user, account_type=account_type)
            if account.account_type == 'demo':
                return Response({'error': 'Withdrawals not allowed on demo accounts'}, status=status.HTTP_400_BAD_REQUEST)

            usd = Currency.objects.get(code='USD')
            wallet = Wallet.objects.get(account=account, wallet_type=wallet_type, currency=usd)
            if wallet.balance < amount:
                return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

            mpesa_phone = ''
            if hasattr(request.user, 'mpesa_number'):
                mpesa_phone = request.user.mpesa_number.phone_number

            ksh = Currency.objects.get(code='KSH')
            exchange_rate = ExchangeRate.objects.get(base_currency=usd, target_currency=ksh).admin_withdrawal_rate
            converted_amount = amount * exchange_rate

            trans = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='withdrawal',
                amount=amount,
                currency=usd,
                target_currency=ksh,
                converted_amount=converted_amount,
                exchange_rate_used=exchange_rate,
                status='pending',
                reference_id=generate_reference_id(),
                description='Withdrawal request',
                mpesa_phone=mpesa_phone
            )

            otp = OTPCode.objects.create(
                user=request.user,
                code=generate_otp(),
                purpose='withdrawal',
                transaction=trans
            )

            send_mail(
                "Withdrawal OTP",
                f"Your OTP for withdrawal of ${amount} is {otp.code}. It expires in 1 minute.",
                settings.DEFAULT_FROM_EMAIL,
                [request.user.email],
                fail_silently=True
            )

            return Response({'transaction_id': trans.id, 'message': 'OTP sent to email'})

        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found'}, status=status.HTTP_404_NOT_FOUND)
        except Currency.DoesNotExist:
            return Response({'error': 'Currency not found'}, status=status.HTTP_400_BAD_REQUEST)
        except ExchangeRate.DoesNotExist:
            return Response({'error': 'Exchange rate not found'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Withdrawal OTP error: {str(e)}")
            return Response({'error': 'Internal error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyWithdrawalOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data['code']
        transaction_id = serializer.validated_data['transaction_id']

        try:
            otp = OTPCode.objects.get(
                user=request.user,
                code=code,
                purpose='withdrawal',
                transaction_id=transaction_id,
                is_used=False
            )
            if otp.is_expired():
                return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)

            otp.is_used = True
            otp.save()

            trans = otp.transaction
            with transaction.atomic():
                wallet = trans.wallet
                wallet.balance -= trans.amount
                wallet.save()  # Deduct amount instantly and trigger sync

                Transaction.objects.create(
                    account=wallet.account,
                    amount=-trans.amount,
                    transaction_type='withdrawal',
                    description=f"Pending: {trans.reference_id}"
                )

            trans.status = 'pending'  # Pending admin approval
            trans.save()

            send_mail(
                "Withdrawal Requested (OTP Verified)",
                f"User: {request.user.username}\nAmount: ${trans.amount} (KSh {trans.converted_amount})\nRef: {trans.reference_id}",
                settings.DEFAULT_FROM_EMAIL,
                [ADMIN_EMAIL]
            )

            return Response({'message': 'OTP verified. Withdrawal pending approval.'})

        except OTPCode.DoesNotExist:
            return Response({'error': 'Invalid OTP or transaction'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"OTP verification error: {str(e)}")
            return Response({'error': 'Internal error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransactionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        transactions = WalletTransaction.objects.filter(wallet__account__user=request.user).order_by('-created_at')
        serializer = WalletTransactionSerializer(transactions, many=True)
        return Response({'transactions': serializer.data})

class MpesaCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

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