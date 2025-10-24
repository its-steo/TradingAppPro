from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import WalletTransaction
from django.db import transaction
from django.conf import settings
from .models import Wallet, Currency
from accounts.models import Account
from django.core.mail import send_mail
from decimal import Decimal
from django.utils import timezone
from dashboard.models import Transaction
import logging

logger = logging.getLogger('wallet')

@receiver(post_save, sender=Account)
def create_default_wallets(sender, instance, created, **kwargs):
    if created:
        usd, _ = Currency.objects.get_or_create(code='USD', defaults={'name': 'US Dollar', 'symbol': '$'})
        ksh, _ = Currency.objects.get_or_create(code='KSH', defaults={'name': 'Kenyan Shilling', 'symbol': 'KSh'})
        with transaction.atomic():
            initial_usd_balance = Decimal('10000.00') if instance.account_type == 'demo' else Decimal('0.00')
            Wallet.objects.get_or_create(
                account=instance, wallet_type='main', currency=usd,
                defaults={'balance': initial_usd_balance}
            )
            Wallet.objects.get_or_create(
                account=instance, wallet_type='trading', currency=ksh,
                defaults={'balance': Decimal('0.00')}
            )

@receiver(post_save, sender=Wallet)
def sync_wallet_to_account(sender, instance, **kwargs):
    if instance.wallet_type == 'main' and instance.currency.code == 'USD':
        try:
            with transaction.atomic():
                if instance.account.balance != instance.balance:
                    instance.account.balance = instance.balance
                    instance.account.save(update_fields=['balance'])
                    logger.info(f"Synced Account {instance.account.id} balance to {instance.balance}")
        except Exception as e:
            logger.error(f"Failed to sync Wallet {instance.id} to Account: {str(e)}")

@receiver(post_save, sender=Account)
def sync_account_to_wallet(sender, instance, **kwargs):
    try:
        wallet = Wallet.objects.get(account=instance, wallet_type='main', currency__code='USD')
        if wallet.balance != instance.balance:
            wallet.balance = instance.balance
            wallet.save(update_fields=['balance'])
            logger.info(f"Synced Wallet {wallet.id} balance to {instance.balance}")
    except Wallet.DoesNotExist:
        logger.warning(f"No main USD wallet for Account {instance.id}")
    except Exception as e:
        logger.error(f"Failed to sync Account {instance.id} to Wallet: {str(e)}")

@receiver(pre_save, sender=WalletTransaction)
def pre_save_wallet_transaction(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None

@receiver(post_save, sender=WalletTransaction)
def post_save_wallet_transaction(sender, instance, **kwargs):
    old_status = getattr(instance, '_old_status', None)
    if old_status == instance.status:
        return  # No change, skip

    # Skip automatic processing for previously failed transactions
    if old_status == 'failed':
        return  # Admin must manually approve via admin interface

    user = instance.wallet.account.user
    wallet = instance.wallet

    if instance.status == 'completed' and old_status != 'completed':
        instance.completed_at = timezone.now()
        instance.save(update_fields=['completed_at'])

        if instance.transaction_type == 'deposit':
            wallet.balance += instance.converted_amount
            wallet.save()
            Transaction.objects.create(
                account=wallet.account,
                amount=instance.converted_amount,
                transaction_type='deposit',
                description=f"Approved: {instance.reference_id}"
            )
            try:
                send_mail(
                    "Deposit Approved!",
                    f"Hi {user.username},\n\nYour deposit of {instance.amount} {instance.currency.code} has been approved.\n{instance.converted_amount} {instance.target_currency.code} credited.\nRef: {instance.reference_id}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True
                )
            except Exception as e:
                logger.error(f"Failed to send deposit approval email for {instance.reference_id}: {str(e)}")

        elif instance.transaction_type == 'withdrawal':
            wallet.balance -= instance.amount
            wallet.save()
            Transaction.objects.create(
                account=wallet.account,
                amount=-instance.amount,
                transaction_type='withdrawal',
                description=f"Paid: {instance.reference_id}"
            )
            try:
                send_mail(
                    "Withdrawal Paid!",
                    f"Hi {user.username},\n\n{instance.amount} {instance.currency.code} has been sent to {instance.mpesa_phone}.\nRef: {instance.reference_id}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True
                )
            except Exception as e:
                logger.error(f"Failed to send withdrawal approval email for {instance.reference_id}: {str(e)}")

    elif instance.status == 'failed' and old_status != 'failed':
        if instance.transaction_type == 'deposit':
            try:
                send_mail(
                    "Deposit Failed",
                    f"Hi {user.username},\n\nYour deposit of {instance.amount} {instance.currency.code} failed.\nRef: {instance.reference_id}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True
                )
            except Exception as e:
                logger.error(f"Failed to send deposit failure email for {instance.reference_id}: {str(e)}")
        elif instance.transaction_type == 'withdrawal':
            try:
                send_mail(
                    "Withdrawal Failed",
                    f"Hi {user.username},\n\nYour withdrawal of {instance.amount} {instance.currency.code} failed.\nRef: {instance.reference_id}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True
                )
            except Exception as e:
                logger.error(f"Failed to send withdrawal failure email for {instance.reference_id}: {str(e)}")