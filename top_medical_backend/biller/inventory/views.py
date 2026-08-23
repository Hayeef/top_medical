from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, F, Sum
from datetime import date, timedelta
from .models import Category, Supplier, Medicine, Batch, StockMovement
from .serializers import (
    CategorySerializer, SupplierSerializer, MedicineSerializer, 
    BatchSerializer, StockMovementSerializer
)

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'contact_person', 'phone', 'email', 'gstin']


class MedicineViewSet(viewsets.ModelViewSet):
    queryset = Medicine.objects.all().prefetch_related('batches')
    serializer_class = MedicineSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'generic_name', 'manufacturer', 'barcode', 'rack_location', 'hsn_code']

    def get_queryset(self):
        qs = Medicine.objects.all().prefetch_related('batches')
        category = self.request.query_params.get('category')
        prescription = self.request.query_params.get('prescription')
        low_stock = self.request.query_params.get('low_stock')
        search = self.request.query_params.get('search')

        if category:
            qs = qs.filter(category_id=category)
        if prescription is not None and prescription != '':
            qs = qs.filter(requires_prescription=(prescription.lower() == 'true'))
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | 
                Q(generic_name__icontains=search) | 
                Q(barcode__icontains=search) |
                Q(manufacturer__icontains=search) |
                Q(rack_location__icontains=search)
            )
        return qs

    @action(detail=False, methods=['get'])
    def pos_search(self, request):
        """Ultra-fast search tailored for POS billing: returns medicines with active stock and FEFO batch info."""
        query = request.query_params.get('q', '').strip()
        if not query:
            medicines = Medicine.objects.filter(is_active=True).prefetch_related('batches')[:30]
        else:
            medicines = Medicine.objects.filter(
                Q(name__icontains=query) |
                Q(generic_name__icontains=query) |
                Q(barcode=query) |
                Q(batches__batch_number__icontains=query)
            ).filter(is_active=True).distinct().prefetch_related('batches')[:40]

        serializer = self.get_serializer(medicines, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Returns medicines that are at or below their reorder threshold."""
        today = date.today()
        medicines = Medicine.objects.filter(is_active=True).prefetch_related('batches')
        low_stock_list = []
        for med in medicines:
            stock = sum(b.pack_quantity for b in med.batches.filter(pack_quantity__gt=0, expiry_date__gt=today))
            if stock <= med.min_stock_alert:
                serializer = MedicineSerializer(med)
                data = serializer.data
                data['current_stock'] = stock
                low_stock_list.append(data)
        return Response(low_stock_list)


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all().select_related('medicine', 'supplier')
    serializer_class = BatchSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['batch_number', 'medicine__name', 'medicine__generic_name', 'supplier__name']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()

        # Record stock movement
        StockMovement.objects.create(
            batch=batch,
            movement_type='PURCHASE',
            quantity_packs=batch.pack_quantity,
            quantity_loose=batch.loose_quantity,
            reference_id=f"INWARD-{batch.batch_number}",
            notes=f"Initial stock added from supplier {batch.supplier.name if batch.supplier else 'Direct Inward'}"
        )

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Returns batches expiring within specified days (default: 90 days)."""
        days = int(request.query_params.get('days', 90))
        today = date.today()
        threshold_date = today + timedelta(days=days)

        batches = Batch.objects.filter(
            expiry_date__gt=today,
            expiry_date__lte=threshold_date,
            pack_quantity__gt=0
        ).select_related('medicine', 'supplier').order_by('expiry_date')

        serializer = self.get_serializer(batches, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Returns expired batches still holding stock."""
        today = date.today()
        batches = Batch.objects.filter(
            expiry_date__lte=today,
            pack_quantity__gt=0
        ).select_related('medicine', 'supplier').order_by('-expiry_date')

        serializer = self.get_serializer(batches, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """Adjust batch stock manually."""
        batch = self.get_object()
        pack_delta = int(request.data.get('pack_delta', 0))
        loose_delta = int(request.data.get('loose_delta', 0))
        reason = request.data.get('reason', 'Manual inventory audit')

        batch.pack_quantity = max(0, batch.pack_quantity + pack_delta)
        batch.loose_quantity = max(0, batch.loose_quantity + loose_delta)
        batch.save()

        StockMovement.objects.create(
            batch=batch,
            movement_type='ADJUSTMENT',
            quantity_packs=pack_delta,
            quantity_loose=loose_delta,
            notes=reason
        )

        return Response(self.get_serializer(batch).data)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.all().select_related('batch', 'batch__medicine')
    serializer_class = StockMovementSerializer
