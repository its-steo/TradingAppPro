from django.db.models.signals import post_save
from django.dispatch import receiver
from accounts.models import User
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator

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