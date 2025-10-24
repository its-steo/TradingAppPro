# accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Account
from dashboard.models import Transaction

class AccountInline(admin.TabularInline):
    model = Account
    extra = 0
    # Remove readonly to allow balance edits
    fields = ('account_type', 'balance')

    def save_model(self, request, obj, form, change):
        if change and 'balance' in form.changed_data:
            old_balance = Account.objects.get(pk=obj.pk).balance
            diff = obj.balance - old_balance
            if diff != 0:
                Transaction.objects.create(
                    account=obj,
                    amount=diff,
                    transaction_type='deposit' if diff > 0 else 'withdrawal',
                    description=f"Admin balance update: Account {obj.id}"
                )
        super().save_model(request, obj, form, change)

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('username', 'email', 'phone', 'is_sashi', 'is_email_verified', 'is_active', 'is_staff')
    list_filter = ('is_sashi', 'is_email_verified', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'phone')
    ordering = ('username',)
    inlines = [AccountInline]
    
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Personal Info', {'fields': ('phone',)}),
        ('Sashi & Verification', {'fields': ('is_sashi', 'is_email_verified')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'phone', 'password1', 'password2', 'is_sashi'),
        }),
    )

admin.site.register(User, CustomUserAdmin)
admin.site.register(Account)