import re
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, F, Sum
from datetime import date, timedelta, datetime
from decimal import Decimal
from .models import Category, Supplier, Medicine, Batch, StockMovement
from .serializers import (
    CategorySerializer, SupplierSerializer, MedicineSerializer, 
    BatchSerializer, StockMovementSerializer
)
from .bill_parser import extract_supplier_invoice
from .medicine_matcher import find_existing_medicine

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
    queryset = Medicine.objects.all().select_related('category').prefetch_related('batches__supplier')
    serializer_class = MedicineSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'generic_name', 'manufacturer', 'barcode', 'rack_location', 'hsn_code']

    def get_queryset(self):
        qs = Medicine.objects.all().select_related('category').prefetch_related('batches__supplier')
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
        """Ultra-fast instant alphabet search tailored for POS billing: returns medicines with active stock and FEFO batch info."""
        query = request.query_params.get('q', '').strip()
        if not query:
            medicines = Medicine.objects.filter(is_active=True).select_related('category').prefetch_related('batches__supplier')[:60]
        elif len(query) == 1:
            # Instant 1-letter alphabet search: starts-with has top priority
            starts = list(
                Medicine.objects.filter(is_active=True, name__istartswith=query)
                .select_related('category').prefetch_related('batches__supplier')[:50]
            )
            if len(starts) < 25:
                contains = list(
                    Medicine.objects.filter(is_active=True, name__icontains=query)
                    .exclude(id__in=[m.id for m in starts])
                    .select_related('category').prefetch_related('batches__supplier')[:30]
                )
                medicines = starts + contains
            else:
                medicines = starts
        else:
            # Multi-character query: starts with name -> generic name -> substring
            starts = list(
                Medicine.objects.filter(is_active=True, name__istartswith=query)
                .select_related('category').prefetch_related('batches__supplier')[:40]
            )
            start_ids = [m.id for m in starts]
            
            contains = list(
                Medicine.objects.filter(
                    Q(name__icontains=query) |
                    Q(generic_name__icontains=query) |
                    Q(barcode__iexact=query)
                ).filter(is_active=True)
                .exclude(id__in=start_ids)
                .select_related('category').prefetch_related('batches__supplier')[:40]
            )
            medicines = starts + contains

        serializer = self.get_serializer(medicines, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def quick_add_tablet_stock(self, request):
        """
        One-stop direct creation of a new Tablet / Medicine with its initial Batch and stock movement.
        """
        data = request.data
        name = str(data.get('name', '')).strip().upper()
        if not name:
            return Response({"error": "Tablet / Medicine name is required."}, status=status.HTTP_400_BAD_REQUEST)

        generic_name = str(data.get('generic_name', '')).strip()
        dosage_form = str(data.get('dosage_form', 'Tablet')).strip()
        category_id = data.get('category')
        manufacturer = str(data.get('manufacturer', 'Standard Pharma')).strip()
        hsn_code = str(data.get('hsn_code', '3004')).strip()
        rack_location = str(data.get('rack_location', 'Rack A-1')).strip()
        min_stock_alert = int(data.get('min_stock_alert', 10))
        requires_prescription = bool(data.get('requires_prescription', False))
        gst_rate = Decimal(str(data.get('gst_rate', 12.0)))

        # Category
        category = None
        if category_id:
            category = Category.objects.filter(id=category_id).first()
        if not category:
            cat_name = data.get('category_name') or 'General'
            category, _ = Category.objects.get_or_create(name=cat_name)

        # Get or create Medicine
        medicine, created_med = Medicine.objects.get_or_create(
            name=name,
            defaults={
                "generic_name": generic_name,
                "dosage_form": dosage_form,
                "category": category,
                "manufacturer": manufacturer,
                "hsn_code": hsn_code,
                "rack_location": rack_location,
                "min_stock_alert": min_stock_alert,
                "requires_prescription": requires_prescription,
                "gst_rate": gst_rate,
            }
        )

        if not created_med:
            if generic_name and not medicine.generic_name:
                medicine.generic_name = generic_name
            if rack_location:
                medicine.rack_location = rack_location
            medicine.save()

        # Batch fields
        batch_number = str(data.get('batch_number') or f"B-{date.today().strftime('%y%m%d')}").strip().upper()
        pack_quantity = int(data.get('pack_quantity', 10))
        pack_size = int(data.get('pack_size', 10))
        purchase_price = Decimal(str(data.get('purchase_price', 50.0)))
        mrp = Decimal(str(data.get('mrp', 90.0)))
        selling_price = Decimal(str(data.get('selling_price', mrp)))
        expiry_date = data.get('expiry_date') or (date.today() + timedelta(days=730)).strftime('%Y-%m-%d')

        # Supplier
        supplier = None
        supplier_id = data.get('supplier')
        supplier_name = data.get('supplier_name')
        if supplier_id:
            supplier = Supplier.objects.filter(id=supplier_id).first()
        elif supplier_name:
            supplier, _ = Supplier.objects.get_or_create(name=str(supplier_name).strip())

        # Create or update Batch
        batch, created_batch = Batch.objects.get_or_create(
            medicine=medicine,
            batch_number=batch_number,
            defaults={
                "supplier": supplier,
                "expiry_date": expiry_date,
                "purchase_price": purchase_price,
                "mrp": mrp,
                "selling_price": selling_price,
                "pack_size": pack_size,
                "pack_quantity": pack_quantity,
                "loose_quantity": 0,
            }
        )

        if not created_batch:
            batch.pack_quantity += pack_quantity
            batch.purchase_price = purchase_price
            batch.mrp = mrp
            batch.selling_price = selling_price
            batch.expiry_date = expiry_date
            if supplier:
                batch.supplier = supplier
            batch.save()

        # Stock Movement
        StockMovement.objects.create(
            batch=batch,
            movement_type='PURCHASE',
            quantity_packs=pack_quantity,
            quantity_loose=0,
            reference_id=f"QUICK-ADD-{batch.batch_number}",
            notes=f"Quick add from table by Admin ({pack_quantity} packs)"
        )

        batch_serializer = BatchSerializer(batch)
        medicine_serializer = MedicineSerializer(medicine)

        return Response({
            "success": True,
            "message": f"Successfully added {medicine.name} (Batch #{batch.batch_number}) with {pack_quantity} packs to stock.",
            "medicine": medicine_serializer.data,
            "batch": batch_serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def bulk_upload_excel(self, request):
        """
        Bulk Upload Inventory from Excel (.xlsx, .xls) or CSV spreadsheet.
        Creates/updates medicines, inward batches, and records stock movements.
        """
        uploaded_file = request.FILES.get('excel_file') or request.FILES.get('file')
        if not uploaded_file:
            # Check if JSON items sent directly from frontend parser
            items_payload = request.data.get('items')
            if items_payload and isinstance(items_payload, list):
                return self._process_bulk_items(items_payload, source_name="Direct Excel Table")
            return Response({"error": "No Excel or CSV file provided."}, status=status.HTTP_400_BAD_REQUEST)

        file_name = uploaded_file.name.lower()
        items_to_process = []

        try:
            if file_name.endswith('.xlsx') or file_name.endswith('.xls'):
                import openpyxl
                wb = openpyxl.load_workbook(uploaded_file, data_only=True)
                sheet = wb.active
                headers = []
                for row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
                    if row_idx == 0:
                        headers = [str(cell).strip().lower() if cell is not None else '' for cell in row]
                        continue
                    if not any(row):
                        continue
                    row_dict = {}
                    for col_idx, val in enumerate(row):
                        if col_idx < len(headers) and headers[col_idx]:
                            row_dict[headers[col_idx]] = val
                    items_to_process.append(self._normalize_excel_row(row_dict))
            else:
                import csv
                import io
                decoded_file = uploaded_file.read().decode('utf-8-sig', errors='replace')
                reader = csv.DictReader(io.StringIO(decoded_file))
                for row in reader:
                    normalized_row = {k.strip().lower(): v for k, v in row.items() if k}
                    items_to_process.append(self._normalize_excel_row(normalized_row))
        except Exception as err:
            return Response({"error": f"Failed to parse Excel file: {str(err)}"}, status=status.HTTP_400_BAD_REQUEST)

        if not items_to_process:
            return Response({"error": "No valid medicine rows found in the uploaded file."}, status=status.HTTP_400_BAD_REQUEST)

        return self._process_bulk_items(items_to_process, source_name=uploaded_file.name)

    def _normalize_excel_row(self, d):
        def get_val(*keys, default=''):
            for k in keys:
                for actual_k, v in d.items():
                    if k in actual_k:
                        return v if v is not None else default
            return default

        name = str(get_val('medicine', 'drug', 'name', 'product')).strip()
        generic = str(get_val('generic', 'composition', 'salt')).strip()
        category = str(get_val('category', 'dept', default='General')).strip()
        form = str(get_val('form', 'type', 'dosage', default='Tablet')).strip()
        mfg = str(get_val('manufacturer', 'company', 'mfg', 'brand', default='Pharma Co')).strip()
        hsn = str(get_val('hsn', default='3004')).strip()
        batch_no = str(get_val('batch', default=f"EX-{date.today().strftime('%y%m')}1")).strip()
        
        # Expiry date parsing
        raw_exp = get_val('expiry', 'exp', default='')
        if isinstance(raw_exp, datetime) or isinstance(raw_exp, date):
            exp_date_str = raw_exp.strftime('%Y-%m-%d')
        elif raw_exp:
            exp_str = str(raw_exp).strip()
            if '/' in exp_str:
                parts = exp_str.split('/')
                if len(parts) == 2:  # MM/YY
                    exp_date_str = f"20{parts[1]}-{parts[0].zfill(2)}-28"
                elif len(parts) == 3:  # DD/MM/YYYY
                    exp_date_str = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                else:
                    exp_date_str = (date.today() + timedelta(days=730)).strftime('%Y-%m-%d')
            elif '-' in exp_str and len(exp_str) == 10:
                exp_date_str = exp_str
            else:
                exp_date_str = (date.today() + timedelta(days=730)).strftime('%Y-%m-%d')
        else:
            exp_date_str = (date.today() + timedelta(days=730)).strftime('%Y-%m-%d')

        try: pack_sz = int(get_val('size', 'pack_size', default=10))
        except: pack_sz = 10
        
        try: pack_qty = int(get_val('quantity', 'qty', 'stock', 'packs', default=10))
        except: pack_qty = 10

        try: purchase_pr = float(get_val('purchase', 'cost', 'rate', default=50.0))
        except: purchase_pr = 50.0

        try: mrp_pr = float(get_val('mrp', default=purchase_pr * 1.4))
        except: mrp_pr = purchase_pr * 1.4

        try: selling_pr = float(get_val('selling', 'sell', 'sp', default=mrp_pr * 0.9))
        except: selling_pr = mrp_pr * 0.9

        try: gst_val = float(get_val('gst', 'tax', default=12.0))
        except: gst_val = 12.0

        rack = str(get_val('rack', 'shelf', 'location', default='Rack A-1')).strip()
        rx_val = str(get_val('prescription', 'rx', default='no')).lower() in ['yes', 'true', '1', 'y']

        return {
            "medicine_name": name,
            "generic_name": generic,
            "category": category or 'General',
            "dosage_form": form or 'Tablet',
            "manufacturer": mfg or 'Pharma Co',
            "hsn_code": hsn or '3004',
            "batch_number": batch_no,
            "expiry_date": exp_date_str,
            "pack_size": pack_sz,
            "pack_quantity": pack_qty,
            "purchase_price": purchase_pr,
            "mrp": mrp_pr,
            "selling_price": selling_pr,
            "gst_rate": gst_val,
            "rack_location": rack,
            "requires_prescription": rx_val
        }

    def _process_bulk_items(self, items, source_name="Excel Upload"):
        supplier, _ = Supplier.objects.get_or_create(
            name="Excel Bulk Inward",
            defaults={"contact_person": "Bulk Inventory Import", "phone": "+91 98000 00000"}
        )

        inwarded_count = 0
        new_medicines_count = 0
        existing_updated_count = 0
        total_inward_value = Decimal('0.00')
        total_mrp_value = Decimal('0.00')

        for item in items:
            med_name = item.get('medicine_name', '').strip()
            if not med_name:
                continue

            dosage_form = item.get('dosage_form', 'Tablet')
            barcode = item.get('barcode')

            # Intelligent deduplication: check if medicine already exists in database
            medicine = find_existing_medicine(med_name, dosage_form=dosage_form, barcode=barcode)

            if medicine:
                existing_updated_count += 1
                # Update auxiliary fields if missing
                if item.get('generic_name') and not medicine.generic_name:
                    medicine.generic_name = item.get('generic_name')
                    medicine.save()
                if item.get('rack_location') and not medicine.rack_location:
                    medicine.rack_location = item.get('rack_location')
                    medicine.save()
            else:
                category_name = item.get('category', 'General')
                category, _ = Category.objects.get_or_create(name=category_name)
                medicine = Medicine.objects.create(
                    name=med_name,
                    generic_name=item.get('generic_name', med_name),
                    category=category,
                    dosage_form=dosage_form,
                    manufacturer=item.get('manufacturer', 'Pharma Co'),
                    hsn_code=item.get('hsn_code', '3004'),
                    rack_location=item.get('rack_location', 'Rack A-1'),
                    min_stock_alert=10,
                    requires_prescription=item.get('requires_prescription', False),
                    gst_rate=Decimal(str(item.get('gst_rate', 12.0))),
                )
                new_medicines_count += 1

            batch_num = str(item.get('batch_number', f"B-{date.today().strftime('%y%m%d')}")).strip()
            pack_qty = max(1, int(item.get('pack_quantity', 1)))
            pack_sz = max(1, int(item.get('pack_size', 10)))
            purchase_pr = Decimal(str(item.get('purchase_price', 50.0)))
            mrp_pr = Decimal(str(item.get('mrp', 90.0)))
            selling_pr = Decimal(str(item.get('selling_price', mrp_pr)))
            exp_date = item.get('expiry_date') or (date.today() + timedelta(days=730)).strftime('%Y-%m-%d')

            # Find or create batch for this medicine
            batch = Batch.objects.filter(medicine=medicine, batch_number__iexact=batch_num).first()
            if batch:
                # Update existing batch stock count and price
                batch.pack_quantity += pack_qty
                batch.purchase_price = purchase_pr
                batch.mrp = mrp_pr
                batch.selling_price = selling_pr
                batch.expiry_date = exp_date
                batch.supplier = supplier
                batch.save()
            else:
                batch = Batch.objects.create(
                    medicine=medicine,
                    supplier=supplier,
                    batch_number=batch_num,
                    expiry_date=exp_date,
                    purchase_price=purchase_pr,
                    mrp=mrp_pr,
                    selling_price=selling_pr,
                    pack_size=pack_sz,
                    pack_quantity=pack_qty,
                    loose_quantity=0,
                )

            StockMovement.objects.create(
                batch=batch,
                movement_type='PURCHASE',
                quantity_packs=pack_qty,
                quantity_loose=0,
                reference_id=f"EXCEL-{date.today().strftime('%Y%m%d')}",
                notes=f"Bulk Excel Inward from {source_name}"
            )

            total_inward_value += (purchase_pr * Decimal(pack_qty))
            total_mrp_value += (mrp_pr * Decimal(pack_qty))
            inwarded_count += 1

        return Response({
            "success": True,
            "message": f"Successfully processed {inwarded_count} medicine batches ({existing_updated_count} existing medicines updated with added stock, {new_medicines_count} new medicines created).",
            "total_items_processed": inwarded_count,
            "existing_medicines_updated": existing_updated_count,
            "new_medicines_created": new_medicines_count,
            "total_inward_value": round(total_inward_value, 2),
            "total_mrp_value": round(total_mrp_value, 2)
        }, status=status.HTTP_201_CREATED)


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

    @action(detail=True, methods=['patch', 'post'])
    def quick_update(self, request, pk=None):
        """
        Fast Inline Editing for Admin:
        Allows modifying purchase_price, mrp, selling_price, pack_quantity, loose_quantity,
        expiry_date, and medicine's rack_location.
        Automatically logs StockMovement when stock count is changed.
        """
        batch = self.get_object()
        data = request.data

        old_pack_qty = batch.pack_quantity
        old_loose_qty = batch.loose_quantity

        if 'purchase_price' in data and data['purchase_price'] is not None:
            batch.purchase_price = Decimal(str(data['purchase_price']))
        if 'mrp' in data and data['mrp'] is not None:
            batch.mrp = Decimal(str(data['mrp']))
        if 'selling_price' in data and data['selling_price'] is not None:
            batch.selling_price = Decimal(str(data['selling_price']))
        if 'expiry_date' in data and data['expiry_date']:
            exp_str = str(data['expiry_date']).strip()
            try:
                batch.expiry_date = datetime.strptime(exp_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                pass
        if 'batch_number' in data and data['batch_number']:
            batch.batch_number = str(data['batch_number']).strip().upper()

        new_pack_qty = int(data['pack_quantity']) if 'pack_quantity' in data else old_pack_qty
        new_loose_qty = int(data['loose_quantity']) if 'loose_quantity' in data else old_loose_qty

        pack_delta = new_pack_qty - old_pack_qty
        loose_delta = new_loose_qty - old_loose_qty

        batch.pack_quantity = max(0, new_pack_qty)
        batch.loose_quantity = max(0, new_loose_qty)
        batch.save()
        batch.refresh_from_db()

        # Update rack location if provided on medicine
        if 'rack_location' in data and batch.medicine:
            batch.medicine.rack_location = str(data['rack_location']).strip()
            batch.medicine.save(update_fields=['rack_location'])

        # If stock quantity changed, log StockMovement
        if pack_delta != 0 or loose_delta != 0:
            notes = data.get('notes') or f"Inline table adjustment: {old_pack_qty} -> {new_pack_qty} packs ({'+' if pack_delta > 0 else ''}{pack_delta})"
            StockMovement.objects.create(
                batch=batch,
                movement_type='ADJUSTMENT',
                quantity_packs=pack_delta,
                quantity_loose=loose_delta,
                reference_id=f"ADJ-{date.today().strftime('%Y%m%d')}",
                notes=notes
            )

        serializer = self.get_serializer(batch)
        return Response({
            "success": True,
            "message": f"Updated {batch.medicine.name} (Batch #{batch.batch_number})",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def bulk_quick_update(self, request):
        """
        Bulk Inline Save for multiple modified batches in table.
        """
        updates = request.data.get('updates', [])
        if not updates:
            return Response({"error": "No updates provided."}, status=status.HTTP_400_BAD_REQUEST)

        updated_batches = []
        movements_to_create = []

        for item in updates:
            batch_id = item.get('id')
            if not batch_id:
                continue
            try:
                batch = Batch.objects.select_related('medicine').get(id=batch_id)
            except Batch.DoesNotExist:
                continue

            old_pack_qty = batch.pack_quantity
            old_loose_qty = batch.loose_quantity

            if 'purchase_price' in item and item['purchase_price'] is not None:
                batch.purchase_price = Decimal(str(item['purchase_price']))
            if 'mrp' in item and item['mrp'] is not None:
                batch.mrp = Decimal(str(item['mrp']))
            if 'selling_price' in item and item['selling_price'] is not None:
                batch.selling_price = Decimal(str(item['selling_price']))
            if 'expiry_date' in item and item['expiry_date']:
                exp_str = str(item['expiry_date']).strip()
                try:
                    batch.expiry_date = datetime.strptime(exp_str, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    pass
            if 'batch_number' in item and item['batch_number']:
                batch.batch_number = str(item['batch_number']).strip().upper()

            new_pack_qty = int(item['pack_quantity']) if 'pack_quantity' in item else old_pack_qty
            new_loose_qty = int(item['loose_quantity']) if 'loose_quantity' in item else old_loose_qty

            pack_delta = new_pack_qty - old_pack_qty
            loose_delta = new_loose_qty - old_loose_qty

            batch.pack_quantity = max(0, new_pack_qty)
            batch.loose_quantity = max(0, new_loose_qty)
            batch.save()
            batch.refresh_from_db()

            if 'rack_location' in item and batch.medicine:
                batch.medicine.rack_location = str(item['rack_location']).strip()
                batch.medicine.save(update_fields=['rack_location'])

            if pack_delta != 0 or loose_delta != 0:
                movements_to_create.append(StockMovement(
                    batch=batch,
                    movement_type='ADJUSTMENT',
                    quantity_packs=pack_delta,
                    quantity_loose=loose_delta,
                    reference_id=f"BULK-ADJ-{date.today().strftime('%Y%m%d')}",
                    notes=f"Bulk table stock adjustment: {old_pack_qty} -> {new_pack_qty} packs"
                ))

            updated_batches.append(batch)

        if movements_to_create:
            StockMovement.objects.bulk_create(movements_to_create)

        serializer = self.get_serializer(updated_batches, many=True)
        return Response({
            "success": True,
            "message": f"Successfully updated {len(updated_batches)} medicine batches.",
            "updated_count": len(updated_batches),
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def stock_table(self, request):
        """
        Dedicated endpoint for the Admin Stock & Price Master Table with financial metrics.
        """
        search = request.query_params.get('search', '').strip()
        category_id = request.query_params.get('category')
        supplier_id = request.query_params.get('supplier')
        status_filter = request.query_params.get('status', 'all')
        limit = int(request.query_params.get('limit', 1000))

        today = date.today()
        expiring_threshold = today + timedelta(days=90)

        qs = Batch.objects.all().select_related('medicine__category', 'supplier').order_by('medicine__name', 'expiry_date')

        if search:
            qs = qs.filter(
                Q(medicine__name__icontains=search) |
                Q(medicine__generic_name__icontains=search) |
                Q(batch_number__icontains=search) |
                Q(medicine__rack_location__icontains=search) |
                Q(medicine__manufacturer__icontains=search) |
                Q(supplier__name__icontains=search)
            )

        if category_id:
            qs = qs.filter(medicine__category_id=category_id)

        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)

        # Status filtering
        if status_filter == 'low_stock':
            qs = qs.filter(pack_quantity__lte=F('medicine__min_stock_alert'), pack_quantity__gt=0)
        elif status_filter == 'out_of_stock':
            qs = qs.filter(pack_quantity=0)
        elif status_filter == 'in_stock':
            qs = qs.filter(pack_quantity__gt=0)
        elif status_filter == 'expiring_soon':
            qs = qs.filter(expiry_date__gt=today, expiry_date__lte=expiring_threshold, pack_quantity__gt=0)
        elif status_filter == 'expired':
            qs = qs.filter(expiry_date__lte=today, pack_quantity__gt=0)

        total_matching_count = qs.count()
        batches = list(qs[:limit])

        # Financial Aggregations
        total_cost_val = sum(Decimal(str(b.purchase_price)) * Decimal(b.pack_quantity) for b in batches)
        total_mrp_val = sum(Decimal(str(b.mrp)) * Decimal(b.pack_quantity) for b in batches)
        total_sell_val = sum(Decimal(str(b.selling_price)) * Decimal(b.pack_quantity) for b in batches)
        total_packs = sum(b.pack_quantity for b in batches)

        gross_profit = total_sell_val - total_cost_val
        margin_pct = float(round((gross_profit / total_sell_val * 100), 1)) if total_sell_val > 0 else 0.0

        serializer = self.get_serializer(batches, many=True)
        return Response({
            "summary": {
                "total_batches": total_matching_count,
                "displayed_batches": len(batches),
                "total_packs": total_packs,
                "total_cost": round(float(total_cost_val), 2),
                "total_mrp": round(float(total_mrp_val), 2),
                "total_selling": round(float(total_sell_val), 2),
                "gross_profit": round(float(gross_profit), 2),
                "margin_pct": margin_pct,
            },
            "results": serializer.data
        })

    @action(detail=False, methods=['post'])
    def scan_supplier_bill(self, request):
        """
        AI / OCR Purchase Bill Scanning Endpoint:
        Takes an uploaded supplier invoice photo/document, base64 snapshot, or preset,
        and extracts line items, batch numbers, expiry dates, quantities, and rates.
        """
        uploaded_file = request.FILES.get('bill_image') or request.FILES.get('file')
        sample_invoice_type = request.data.get('sample_type', 'standard')
        image_base64 = request.data.get('image_base64')
        custom_key = request.data.get('gemini_api_key')

        try:
            extracted_data = extract_supplier_invoice(
                uploaded_file=uploaded_file,
                sample_type=sample_invoice_type,
                image_base64=image_base64,
                custom_api_key=custom_key
            )
            return Response(extracted_data, status=status.HTTP_200_OK)
        except Exception as e:
            print("Scan invoice error:", e)
            return Response({"error": f"Failed to scan invoice: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def bulk_inward_from_bill(self, request):
        """
        Atomically inward medicines and batches reviewed from the supplier purchase bill.
        """
        supplier_name = request.data.get('supplier_name', 'Wholesale Supplier').strip()
        supplier_gstin = request.data.get('supplier_gstin', '').strip()
        supplier_phone = request.data.get('supplier_phone', '').strip()
        supplier_address = request.data.get('supplier_address', '').strip()
        invoice_number = request.data.get('invoice_number', f"PUR-{date.today().strftime('%Y%m%d')}").strip()
        invoice_date = request.data.get('invoice_date', date.today().strftime('%Y-%m-%d'))
        items = request.data.get('items', [])

        if not items:
            return Response({"error": "No items provided for stock inward."}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create Supplier
        supplier, _ = Supplier.objects.get_or_create(
            name=supplier_name,
            defaults={
                "contact_person": "Wholesale Billing",
                "phone": supplier_phone or "+91 98000 00000",
                "gstin": supplier_gstin,
                "address": supplier_address
            }
        )
        if supplier_gstin and not supplier.gstin:
            supplier.gstin = supplier_gstin
            supplier.save()
        if supplier_phone and not supplier.phone:
            supplier.phone = supplier_phone
            supplier.save()
        if supplier_address and not supplier.address:
            supplier.address = supplier_address
            supplier.save()

        inwarded_batches = []
        new_medicines_count = 0
        existing_medicines_count = 0
        total_inwarded_value = Decimal('0.00')
        total_mrp_value = Decimal('0.00')

        for item in items:
            med_name = item.get('medicine_name', '').strip()
            if not med_name:
                continue

            dosage_form = item.get('dosage_form', 'Tablet')
            barcode = item.get('barcode')

            # Intelligent deduplication: check if medicine already exists
            medicine = find_existing_medicine(med_name, dosage_form=dosage_form, barcode=barcode)

            if medicine:
                existing_medicines_count += 1
                if item.get('rack_location') and not medicine.rack_location:
                    medicine.rack_location = item.get('rack_location')
                    medicine.save()
            else:
                category_name = item.get('category', 'General Pharmaceuticals')
                category, _ = Category.objects.get_or_create(name=category_name)
                medicine = Medicine.objects.create(
                    name=med_name,
                    generic_name=item.get('generic_name', med_name),
                    category=category,
                    dosage_form=dosage_form,
                    manufacturer=item.get('manufacturer', 'Pharma Standard'),
                    hsn_code=item.get('hsn_code', '3004'),
                    rack_location=item.get('rack_location', 'Rack A-1'),
                    min_stock_alert=10,
                    requires_prescription=item.get('requires_prescription', False),
                    gst_rate=Decimal(str(item.get('gst_rate', 12.0))),
                )
                new_medicines_count += 1

            # Create or update Batch
            batch_num = (item.get('batch_number') or f"B-{date.today().strftime('%y%m%d')}").strip()
            pack_qty = max(1, int(item.get('pack_quantity', 1)))
            pack_sz = max(1, int(item.get('pack_size', 10)))
            purchase_pr = Decimal(str(item.get('purchase_price', 100.0)))
            mrp_pr = Decimal(str(item.get('mrp', 150.0)))
            selling_pr = Decimal(str(item.get('selling_price', mrp_pr)))
            exp_date_str = item.get('expiry_date') or (date.today() + timedelta(days=730)).strftime('%Y-%m-%d')

            batch = Batch.objects.filter(medicine=medicine, batch_number__iexact=batch_num).first()
            if batch:
                # Add additional stock to existing batch
                batch.pack_quantity += pack_qty
                batch.purchase_price = purchase_pr
                batch.mrp = mrp_pr
                batch.selling_price = selling_pr
                batch.expiry_date = exp_date_str
                batch.supplier = supplier
                batch.save()
            else:
                batch = Batch.objects.create(
                    medicine=medicine,
                    supplier=supplier,
                    batch_number=batch_num,
                    expiry_date=exp_date_str,
                    purchase_price=purchase_pr,
                    mrp=mrp_pr,
                    selling_price=selling_pr,
                    pack_size=pack_sz,
                    pack_quantity=pack_qty,
                    loose_quantity=0,
                )

            # Record Stock Movement
            StockMovement.objects.create(
                batch=batch,
                movement_type='PURCHASE',
                quantity_packs=pack_qty,
                quantity_loose=0,
                reference_id=invoice_number,
                notes=f"Purchase Inward: Bill #{invoice_number} ({supplier.name}) on {invoice_date}"
            )

            total_inwarded_value += (purchase_pr * Decimal(pack_qty))
            total_mrp_value += (mrp_pr * Decimal(pack_qty))
            inwarded_batches.append(batch.id)

        return Response({
            "success": True,
            "message": f"Successfully inwarded {len(inwarded_batches)} medicine batches into inventory ({new_medicines_count} new medicines).",
            "supplier": supplier.name,
            "invoice_number": invoice_number,
            "total_items": len(inwarded_batches),
            "new_medicines_created": new_medicines_count,
            "total_inward_value": round(total_inwarded_value, 2),
            "total_mrp_value": round(total_mrp_value, 2)
        }, status=status.HTTP_201_CREATED)



class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.all().select_related('batch', 'batch__medicine')
    serializer_class = StockMovementSerializer
