from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from accounts.models import User, Account
from accounts.serializers import UserSerializer
from .models import Transaction
from .serializers import TransactionSerializer

class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        user_serializer = UserSerializer(user)
        accounts = Account.objects.filter(user=user)
        account_data = []
        for account in accounts:
            transactions = Transaction.objects.filter(account=account)
            transaction_serializer = TransactionSerializer(transactions, many=True)
            account_data.append({
                'account_type': account.account_type,
                'balance': account.balance,
                'transactions': transaction_serializer.data
            })
        return Response({
            'user': user_serializer.data,
            'accounts': account_data
        }, status=status.HTTP_200_OK)

class DepositView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        amount = request.data.get('amount')
        account_type = request.data.get('account_type', 'standard')
        try:
            amount = float(amount)
            if amount <= 0:
                return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            account = Account.objects.get(user=user, account_type=account_type)
            if account.account_type == 'demo':
                return Response({'error': 'Deposits only allowed on real accounts'}, status=status.HTTP_400_BAD_REQUEST)
            account.balance += amount
            account.save()
            Transaction.objects.create(
                account=account,
                amount=amount,
                transaction_type='deposit',
                description=f"Deposit to {account.account_type} account"
            )
            return Response({
                'balance': account.balance,
                'message': f"Deposited {amount} to {account.account_type} account"
            }, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

class WithdrawalView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        amount = request.data.get('amount')
        account_type = request.data.get('account_type', 'standard')
        try:
            amount = float(amount)
            if amount <= 0:
                return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            account = Account.objects.get(user=user, account_type=account_type)
            if account.account_type == 'demo':
                return Response({'error': 'Withdrawals only allowed on real accounts'}, status=status.HTTP_400_BAD_REQUEST)
            if amount > account.balance:
                return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
            account.balance -= amount
            account.save()
            Transaction.objects.create(
                account=account,
                amount=amount,
                transaction_type='withdrawal',
                description=f"Withdrawal from {account.account_type} account"
            )
            return Response({
                'balance': account.balance,
                'message': f"Withdrew {amount} from {account.account_type} account"
            }, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

class ResetDemoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            account = Account.objects.get(user=user, account_type='demo')
            account.reset_demo_balance()
            Transaction.objects.filter(account=account).delete()
            return Response({'message': 'Demo balance reset to 10,000 USD'}, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'error': 'Demo account not found'}, status=status.HTTP_404_NOT_FOUND)