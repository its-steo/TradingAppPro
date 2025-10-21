# trading/urls.py
from django.urls import path
from .views import (
    MarketListView,
    TradeTypeListView,
    RobotListView,
    PurchaseRobotView,
    UserRobotListView,
    PlaceTradeView,
    TradeHistoryView,  # Ensure this is imported
)

urlpatterns = [
    path('markets/', MarketListView.as_view(), name='market_list'),
    path('trade-types/', TradeTypeListView.as_view(), name='trade_type_list'),
    path('robots/', RobotListView.as_view(), name='robot_list'),
    path('purchase-robot/', PurchaseRobotView.as_view(), name='purchase_robot'),
    path('user-robots/', UserRobotListView.as_view(), name='user_robot_list'),
    path('trades/place/', PlaceTradeView.as_view(), name='place_trade'),
    path('trades/history/', TradeHistoryView.as_view(), name='trade_history'),  # Uncommented
]