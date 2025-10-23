from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from accounts.models import Account

class MarketType(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g., 'forex', 'crypto'
    profit_multiplier = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('1.85'),
        validators=[MinValueValidator(Decimal('1.00'))]
    )

    def __str__(self):
        return self.name

class Market(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g., 'EURUSD', 'AUDCAD'
    market_type = models.ForeignKey(MarketType, on_delete=models.PROTECT, related_name='markets')

    def __str__(self):
        return self.name

    @property
    def profit_multiplier(self):
        return self.market_type.profit_multiplier

class TradeType(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g., 'buy/sell', 'rise/fall', 'touch/no touch'

    def __str__(self):
        return self.name

class Robot(models.Model):
    name = models.CharField(max_length=100, unique=True)
    image = models.ImageField(upload_to='robots/', blank=True, null=True)  # S3 storage
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    available_for_demo = models.BooleanField(default=True)  # Allow demo users to use without purchase
    win_rate = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])

    def __str__(self):
        return self.name

class UserRobot(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_robots')
    robot = models.ForeignKey(Robot, on_delete=models.PROTECT)
    purchased_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'robot')

    def __str__(self):
        return f"{self.user.username} - {self.robot.name}"

class TradingSetting(models.Model):
    martingale_multiplier = models.PositiveIntegerField(default=2)

    @classmethod
    def get_instance(cls):
        instance, _ = cls.objects.get_or_create(id=1)
        return instance

class Trade(models.Model):
    DIRECTIONS = [
        ('buy', 'Buy/Rise/Touch'),
        ('sell', 'Sell/Fall/No Touch'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trades')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='trades')
    market = models.ForeignKey(Market, on_delete=models.PROTECT)
    trade_type = models.ForeignKey(TradeType, on_delete=models.PROTECT)
    direction = models.CharField(max_length=10, choices=DIRECTIONS)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_win = models.BooleanField()
    profit = models.DecimalField(max_digits=12, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)
    used_martingale = models.BooleanField(default=False)
    martingale_level = models.PositiveIntegerField(default=0)
    used_robot = models.ForeignKey(Robot, on_delete=models.SET_NULL, null=True, blank=True)
    session_profit_before = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    is_demo = models.BooleanField(default=False)  # Flag for demo trades
    entry_spot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # Added
    exit_spot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)   # Added
    current_spot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True) # Added

    def __str__(self):
        return f"{self.user.username} - {self.market.name} - {self.direction} - {'Win' if self.is_win else 'Loss'}"