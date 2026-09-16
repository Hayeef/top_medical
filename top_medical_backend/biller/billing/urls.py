from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PharmacyProfileViewSet, StaffMemberViewSet, DoctorViewSet,
    CustomerViewSet, InvoiceViewSet, LoginAPIView, DailyFinanceRecordViewSet
)

router = DefaultRouter()
router.register(r'profile', PharmacyProfileViewSet, basename='pharmacy-profile')
router.register(r'staff', StaffMemberViewSet)
router.register(r'doctors', DoctorViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'daily-finance', DailyFinanceRecordViewSet, basename='daily-finance')

urlpatterns = [
    path('auth/login/', LoginAPIView.as_view(), name='api-login'),
    path('', include(router.urls)),
]
