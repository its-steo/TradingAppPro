from django.db.models.signals import post_save
from django.dispatch import receiver
from accounts.models import User, Account
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from wallet.models import Wallet  # Import Wallet from wallet app
from decimal import Decimal
import logging

logger = logging.getLogger('accounts')

@receiver(post_save, sender=User)
def send_verification_email(sender, instance, created, **kwargs):
    if created and not instance.is_email_verified:
        token = default_token_generator.make_token(instance)
        uid = urlsafe_base64_encode(force_bytes(instance.pk))
        verify_link = f"https://yourdomain.com/verify/{uid}/{token}/"
        send_mail(
            'Verify Your TradeRiser Account',
            f'Click to verify: {verify_link}',
            'no-reply@traderiser.com',
            [instance.email],
            fail_silently=False,
        )

@receiver(post_save, sender=Account)
def sync_account_to_wallet(sender, instance, **kwargs):
    """Sync Account.balance to the main USD wallet balance if different."""
    try:
        wallet = Wallet.objects.get(account=instance, wallet_type='main', currency__code='USD')
        if wallet.balance != instance.balance:
            wallet.balance = instance.balance
            wallet.save(update_fields=['balance'])
            logger.info(f"Synced Wallet {wallet.id} balance to {instance.balance} from Account {instance.id}")
    except Wallet.DoesNotExist:
        logger.warning(f"No main USD wallet found for Account {instance.id}; skipping sync")
    except Exception as e:
        logger.error(f"Failed to sync Account {instance.id} to wallet: {str(e)}")