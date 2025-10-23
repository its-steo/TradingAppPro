from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Account

class AccountInline(admin.TabularInline):
    model = Account
    extra = 0
    readonly_fields = ('balance',)

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