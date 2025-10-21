import time
import random
from decimal import Decimal
from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Market, TradeType, Robot, UserRobot, TradingSetting, Trade
from .serializers import MarketSerializer, TradeTypeSerializer, RobotSerializer, UserRobotSerializer, TradeSerializer
from accounts.models import Account
from dashboard.models import Transaction
from decimal import Decimal, InvalidOperation

class MarketListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        markets = Market.objects.all()
        serializer = MarketSerializer(markets, many=True)
        return Response(serializer.data)

class TradeTypeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        trade_types = TradeType.objects.all()
        serializer = TradeTypeSerializer(trade_types, many=True)
        return Response(serializer.data)

class RobotListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        robots = Robot.objects.all()
        serializer = RobotSerializer(robots, many=True)
        return Response(serializer.data)

class PurchaseRobotView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        robot_id = request.data.get('robot_id')
        account_type = request.data.get('account_type', 'standard')
        try:
            robot = Robot.objects.get(id=robot_id)
            account = Account.objects.get(user=request.user, account_type=account_type)
            if account.account_type == 'demo':
                if robot.available_for_demo:
                    UserRobot.objects.get_or_create(user=request.user, robot=robot)
                    return Response({'message': 'Robot assigned for demo use'}, status=status.HTTP_200_OK)
                return Response({'error': 'This robot is not available for demo accounts'}, status=status.HTTP_400_BAD_REQUEST)
            if account.balance < robot.price:
                return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
            account.balance -= robot.price
            account.save()
            Transaction.objects.create(
                account=account,
                amount=-robot.price,
                transaction_type='debit',
                description=f'Purchased robot: {robot.name}'
            )
            UserRobot.objects.create(user=request.user, robot=robot)
            return Response({'message': 'Robot purchased successfully'}, status=status.HTTP_201_CREATED)
        except Robot.DoesNotExist:
            return Response({'error': 'Robot not found'}, status=status.HTTP_404_NOT_FOUND)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

class UserRobotListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_robots = UserRobot.objects.filter(user=request.user)
        serializer = UserRobotSerializer(user_robots, many=True)
        return Response(serializer.data)

# trading/views.py (relevant part: PlaceTradeView)

class PlaceTradeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user
        market_id = data.get('market_id')
        trade_type_id = data.get('trade_type_id')
        direction = data.get('direction')  # e.g., 'buy' or 'sell'
        try:
            amount = Decimal(data.get('amount'))
            if amount <= Decimal('0.00'):
                raise ValueError
        except (TypeError, ValueError, InvalidOperation):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
        
        account_type = data.get('account_type', 'standard')
        use_martingale = data.get('use_martingale', False)
        martingale_level = data.get('martingale_level', 0)
        robot_id = data.get('robot_id', None)  # Optional for robot trades

        try:
            market = Market.objects.get(id=market_id)
            trade_type = TradeType.objects.get(id=trade_type_id)
            account = Account.objects.get(user=user, account_type=account_type)
            is_demo = account.account_type == 'demo'

            used_robot = None
            win_rate = 50  # Default, to be overridden
            if robot_id:
                user_robot = UserRobot.objects.get(user=user, robot__id=robot_id)
                used_robot = user_robot.robot
                win_rate = used_robot.win_rate  # Use robot's win_rate as-is (distributed accordingly)
            else:
                # Non-robot trades: Enforce based on Sashi status
                win_rate = 90 if user.is_sashi else 10

            # Deduct stake if not demo
            if not is_demo:
                if amount > account.balance:
                    return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
                account.balance -= amount
                account.save()

            # Simulate trade delay (e.g., for "execution")
            time.sleep(random.uniform(3, 7))  # Random delay for realism

            # Simulate spot prices (for display/analytics, not affecting win/loss)
            entry_spot = Decimal(random.uniform(1.0, 100.0)).quantize(Decimal('0.01'))
            change = random.uniform(-0.05, 0.05)
            exit_spot = (entry_spot * Decimal(1 + change)).quantize(Decimal('0.01'))
            current_spot = exit_spot

            # Determine is_win with martingale enforcement for non-Sashi
            if use_martingale and martingale_level > 0 and not user.is_sashi:
                is_win = False  # Force loss on multiplied martingale trades
            else:
                is_win = random.choices([True, False], weights=[win_rate, 100 - win_rate])[0]

            # Calculate payout and profit
            multiplier = market.profit_multiplier
            payout = amount * multiplier if is_win else Decimal('0.00')
            profit = payout - amount

            # Add back payout if not demo
            if not is_demo:
                account.balance += payout
                account.save()

            # Create Trade record
            trade = Trade.objects.create(
                user=user,
                account=account,
                market=market,
                trade_type=trade_type,
                direction=direction,
                amount=amount,
                is_win=is_win,
                profit=profit,
                used_martingale=use_martingale,
                martingale_level=martingale_level,
                used_robot=used_robot,
                session_profit_before=Decimal('0.00'),  # Assuming single trade; update if sessions are tracked
                is_demo=is_demo,
                entry_spot=entry_spot,
                exit_spot=exit_spot,
                current_spot=current_spot
            )

            # Create transaction
            Transaction.objects.create(
                account=account,
                amount=profit,
                transaction_type='credit' if is_win else 'debit',
                description=f"{'Demo ' if is_demo else ''}Trade on {market.name}: {'Win' if is_win else 'Loss'}"
            )

            # Prepare response messages
            messages = ['Trade completed.']
            if is_win and used_robot:
                messages.append(f'Congratulations, {used_robot.name} has printed ${profit} successfully')

            return Response({
                'trade': TradeSerializer(trade).data,
                'message': ' '.join(messages),
                'profit': profit,
                'is_demo': is_demo
            }, status=status.HTTP_201_CREATED)

        except Market.DoesNotExist:
            return Response({'error': 'Market not found'}, status=status.HTTP_404_NOT_FOUND)
        except TradeType.DoesNotExist:
            return Response({'error': 'Trade type not found'}, status=status.HTTP_404_NOT_FOUND)
        except Account.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        except UserRobot.DoesNotExist:
            return Response({'error': 'User robot not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            # Rollback deduction on error (if deduction occurred)
            if not is_demo:
                account.balance += amount
                account.save()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
             
class TradeHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            params = request.query_params
            trades = Trade.objects.filter(user=request.user)
            
            if 'asset_id' in params:
                trades = trades.filter(market_id=params['asset_id'])
            if 'account_type' in params:
                trades = trades.filter(account__account_type=params['account_type'])
            if 'is_demo' in params:
                trades = trades.filter(is_demo=params['is_demo'].lower() == 'true')

            serializer = TradeSerializer(trades, many=True)
            # Calculate total session profit for the day
            today = date.today()
            session_trades = trades.filter(timestamp__date=today)
            total_session_profit = sum(trade.profit for trade in session_trades)
            return Response({
                'trades': serializer.data,
                'total_session_profit': total_session_profit
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)