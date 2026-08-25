from django.urls import path
from .views import (
    DashboardSummaryView, SalesTrendView, 
    CategoryDistributionView, TopSellingView,
    PaymentBreakdownView
)

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='analytics-summary'),
    path('payment-breakdown/', PaymentBreakdownView.as_view(), name='analytics-payment-breakdown'),
    path('sales-trend/', SalesTrendView.as_view(), name='analytics-sales-trend'),
    path('category-distribution/', CategoryDistributionView.as_view(), name='analytics-category-dist'),
    path('top-selling/', TopSellingView.as_view(), name='analytics-top-selling'),
]

