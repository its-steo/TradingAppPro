# trading/serializers.py
from rest_framework import serializers
from .models import MarketType, Market, TradeType, Robot, UserRobot, Trade

class MarketTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketType
        fields = '__all__'

class MarketSerializer(serializers.ModelSerializer):
    market_type = MarketTypeSerializer(read_only=True)
    profit_multiplier = serializers.DecimalField(
        source='market_type.profit_multiplier',
        max_digits=5,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Market
        fields = ['id', 'name', 'market_type', 'profit_multiplier']

class TradeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeType
        fields = '__all__'

class RobotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Robot
        fields = '__all__'

class UserRobotSerializer(serializers.ModelSerializer):
    robot = RobotSerializer(read_only=True)

    class Meta:
        model = UserRobot
        fields = ['id', 'robot', 'purchased_at']

class TradeSerializer(serializers.ModelSerializer):
    market = MarketSerializer(read_only=True)
    trade_type = TradeTypeSerializer(read_only=True)
    used_robot = RobotSerializer(read_only=True)  # If needed for history

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['user', 'is_win', 'profit', 'timestamp', 'session_profit_before']