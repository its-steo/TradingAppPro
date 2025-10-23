# models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.validators import UnicodeUsernameValidator

class User(AbstractUser):
    username_validator = UnicodeUsernameValidator()

    username = models.CharField(
        max_length=150,
        unique=True,
        help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
        validators=[username_validator],
    )
    email = models.EmailField(unique=True)  # Keep unique for simplicity
    phone = models.CharField(max_length=20, blank=True)
    is_sashi = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.username

    def can_create_account(self, account_type):
        """Check if user can create an account of the given type."""
        existing_accounts = self.accounts.all()
        if len(existing_accounts) >= 2:
            return False
        if account_type == 'demo' and any(acc.account_type == 'demo' for acc in existing_accounts):
            return False
        if account_type != 'demo' and any(acc.account_type != 'demo' for acc in existing_accounts):
            return False
        return True

class Account(models.Model):
    ACCOUNT_TYPES = [
        ('standard', 'TradeRiser Standard'),
        ('pro', 'TradeRiser Pro'),
        ('islamic', 'TradeRiser Islamic'),
        ('options', 'TradeRiser Options'),
        ('crypto', 'TradeRiser Crypto'),
        ('demo', 'TradeRiser Demo'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts')
    account_type = models.CharField(max_length=50, choices=ACCOUNT_TYPES)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ('user', 'account_type')

    def save(self, *args, **kwargs):
        if not self.pk and self.account_type == 'demo':
            self.balance = 10000.00
        super().save(*args, **kwargs)

    def reset_demo_balance(self):
        if self.account_type == 'demo':
            self.balance = 10000.00
            self.save()

    def __str__(self):
        return f"{self.user.username} - {self.account_type}"