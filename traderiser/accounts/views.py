from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Account
from .serializers import UserSerializer, AccountSerializer

class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        account_type = data.get('account_type', 'standard')
        if account_type not in [choice[0] for choice in Account.ACCOUNT_TYPES]:
            return Response({'error': 'Invalid account type'}, status=status.HTTP_400_BAD_REQUEST)

        email = data.get('email')
        password = data.get('password')
        if not email or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            existing_user = User.objects.get(email=email)
            # Existing user - add account if password matches and can create
            if not existing_user.check_password(password):
                return Response({'error': 'Invalid password for existing email'}, status=status.HTTP_401_UNAUTHORIZED)

            if not existing_user.can_create_account(account_type):
                return Response({'error': 'Cannot create this account type for the user (already exists or limit reached)'}, 
                               status=status.HTTP_400_BAD_REQUEST)

            Account.objects.create(user=existing_user, account_type=account_type)
            refresh = RefreshToken.for_user(existing_user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(existing_user).data
            }, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            # New user
            serializer = UserSerializer(data={
                'username': data.get('username'),
                'email': email,
                'phone': data.get('phone'),
            })
            if serializer.is_valid():
                user = serializer.save()
                user.set_password(password)
                user.save()
                # Create the requested account (real or demo)
                Account.objects.create(user=user, account_type=account_type)
                # Auto-create demo account if a real account is created
                if account_type != 'demo' and not user.accounts.filter(account_type='demo').exists():
                    Account.objects.create(user=user, account_type='demo')
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CreateAdditionalAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        account_type = request.data.get('account_type', 'standard')
        if account_type not in [choice[0] for choice in Account.ACCOUNT_TYPES]:
            return Response({'error': 'Invalid account type'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.can_create_account(account_type):
            return Response({'error': 'User already has the maximum allowed accounts or this account type'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            Account.objects.create(user=user, account_type=account_type)
            return Response({
                'message': f'{account_type} account created successfully',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        account_type = request.data.get('account_type', 'standard')
        if account_type not in [choice[0] for choice in Account.ACCOUNT_TYPES]:
            return Response({'error': 'Invalid account type'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=email, password=password)
        if user and user.accounts.filter(account_type=account_type).exists():
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data,
                'account_type': account_type
            }, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid credentials or account type not found'}, status=status.HTTP_401_UNAUTHORIZED)

class SashiToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        account_type = request.data.get('account_type', 'standard')
        try:
            account = Account.objects.get(user=request.user, account_type=account_type)
            if account.account_type == 'demo':
                return Response({'error': 'Demo accounts cannot toggle Sashi status'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            user = request.user
            user.is_sashi = not user.is_sashi
            user.save()
            return Response({'is_sashi': user.is_sashi}, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

class AccountDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response({
            'user': serializer.data
        }, status=status.HTTP_200_OK)

class ResetDemoBalanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            account = Account.objects.get(user=request.user, account_type='demo')
            account.reset_demo_balance()
            from dashboard.models import Transaction
            Transaction.objects.filter(account=account).delete()
            return Response({
                'balance': account.balance,
                'message': 'Demo balance reset to 10,000 USD'
            }, status=status.HTTP_200_OK)
        except Account.DoesNotExist:
            return Response({'error': 'Demo account not found'}, status=status.HTTP_404_NOT_FOUND)