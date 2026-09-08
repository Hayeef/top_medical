import io
from decimal import Decimal
from datetime import datetime, date
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Design Palette Constants
COLOR_NAVY = "0F172A"       # Main header background
COLOR_BRAND = "0284C7"      # Brand Sky Blue
COLOR_EMERALD = "059669"    # Cash / Success
COLOR_INDIGO = "4F46E5"     # Sales / Accent
COLOR_ROSE = "E11D48"       # Due / Cancelled
COLOR_MUTED_BG = "F8FAFC"   # Alternate row zebra
COLOR_TOTAL_BG = "E2E8F0"   # Summary row background
COLOR_BORDER = "CBD5E1"     # Table borders

FONT_TITLE = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
FONT_SUBTITLE = Font(name="Calibri", size=9, italic=True, color="E2E8F0")
FONT_SECTION = Font(name="Calibri", size=11, bold=True, color="0F172A")
FONT_HEADER = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
FONT_DATA = Font(name="Calibri", size=9.5, color="1E293B")
FONT_DATA_BOLD = Font(name="Calibri", size=9.5, bold=True, color="0F172A")
FONT_TOTAL = Font(name="Calibri", size=10, bold=True, color="0F172A")

FILL_NAVY = PatternFill(start_color=COLOR_NAVY, end_color=COLOR_NAVY, fill_type="solid")
FILL_BRAND = PatternFill(start_color=COLOR_BRAND, end_color=COLOR_BRAND, fill_type="solid")
FILL_ZEBRA = PatternFill(start_color=COLOR_MUTED_BG, end_color=COLOR_MUTED_BG, fill_type="solid")
FILL_TOTAL = PatternFill(start_color=COLOR_TOTAL_BG, end_color=COLOR_TOTAL_BG, fill_type="solid")

ALIGN_LEFT = Alignment(horizontal="left", vertical="center")
ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")
ALIGN_CENTER = Alignment(horizontal="center", vertical="center")
ALIGN_HEADER = Alignment(horizontal="center", vertical="center", wrap_text=True)

BORDER_THIN = Border(
    left=Side(style="thin", color=COLOR_BORDER),
    right=Side(style="thin", color=COLOR_BORDER),
    top=Side(style="thin", color=COLOR_BORDER),
    bottom=Side(style="thin", color=COLOR_BORDER)
)

BORDER_TOTAL = Border(
    left=Side(style="thin", color=COLOR_BORDER),
    right=Side(style="thin", color=COLOR_BORDER),
    top=Side(style="thin", color="94A3B8"),
    bottom=Side(style="double", color="0F172A")
)

FORMAT_CURRENCY = '#,##0.00'
FORMAT_INTEGER = '#,##0'
FORMAT_PERCENT = '0.00"%"'


def auto_fit_columns(ws, max_widths=None):
    """Adjusts column widths based on maximum contents with safety padding."""
    max_widths = max_widths or {}
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            val_str = str(cell.value or '')
            # Skip long merged title strings from expanding columns excessively
            if len(val_str) > 0 and cell.row > 4:
                lines = val_str.split('\n')
                line_max = max(len(l) for l in lines)
                if line_max > max_len:
                    max_len = line_max
        fitted = max(max_len + 3, 10)
        if col_letter in max_widths:
            fitted = min(fitted, max_widths[col_letter])
        ws.column_dimensions[col_letter].width = min(fitted, 45)


def add_pharmacy_header(ws, profile, title_text, filter_info, end_col_letter="P"):
    """Creates a branded top banner for pharmacy reports."""
    name = getattr(profile, 'name', 'TOP MEDICAL PHARMACY')
    address = getattr(profile, 'address', '')
    gstin = getattr(profile, 'gstin', '')
    dl_no = getattr(profile, 'dl_number_20b', '')
    phone = getattr(profile, 'phone', '')

    # Row 1: Pharmacy Name & Title
    ws.merge_cells(f"A1:{end_col_letter}1")
    cell_a1 = ws["A1"]
    cell_a1.value = f"{name.upper()} - {title_text}"
    cell_a1.font = FONT_TITLE
    cell_a1.fill = FILL_NAVY
    cell_a1.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 32

    # Row 2: Pharmacy Details & License
    ws.merge_cells(f"A2:{end_col_letter}2")
    cell_a2 = ws["A2"]
    details_parts = []
    if gstin: details_parts.append(f"GSTIN: {gstin}")
    if dl_no: details_parts.append(f"DL No: {dl_no}")
    if phone: details_parts.append(f"Phone: {phone}")
    if address: details_parts.append(f"Address: {address}")
    cell_a2.value = "  |  ".join(details_parts)
    cell_a2.font = FONT_SUBTITLE
    cell_a2.fill = FILL_NAVY
    cell_a2.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 18

    # Row 3: Report Filters and Generated Date
    ws.merge_cells(f"A3:{end_col_letter}3")
    cell_a3 = ws["A3"]
    now_str = timezone.localtime(timezone.now()).strftime('%d-%b-%Y %I:%M %p') if hasattr(timezone, 'localtime') else timezone.now().strftime('%d-%b-%Y %I:%M %p')
    cell_a3.value = f"Report Scope: {filter_info}  |  Generated On: {now_str}"
    cell_a3.font = Font(name="Calibri", size=9, bold=True, color="0369A1")
    cell_a3.fill = PatternFill(start_color="F0F9FF", end_color="F0F9FF", fill_type="solid")
    cell_a3.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[3].height = 20


def generate_bills_excel(invoices_qs, profile, filter_info, report_title, export_type='full'):
    """
    Generates a professionally styled Excel workbook containing:
    - Tab 1: Executive Summary & KPIs (if export_type == 'full')
    - Tab 2: Bills Ledger
    - Tab 3: Itemized Sales Details
    """
    wb = Workbook()
    # Remove default empty sheet
    wb.remove(wb.active)

    invoices = list(invoices_qs)
    active_invoices = [inv for inv in invoices if inv.payment_status not in ['CANCELLED', 'REFUNDED']]

    # Calculate Aggregates
    total_billed = sum((inv.grand_total or Decimal('0.00')) for inv in active_invoices)
    total_cash = sum((inv.cash_amount or Decimal('0.00')) for inv in active_invoices)
    total_upi = sum((inv.upi_amount or Decimal('0.00')) for inv in active_invoices)
    total_card = sum((inv.card_amount or Decimal('0.00')) for inv in active_invoices)
    total_paid = sum((inv.amount_paid or Decimal('0.00')) for inv in active_invoices)
    total_discount = sum((inv.discount_amount or Decimal('0.00')) for inv in active_invoices)
    total_tax = sum((inv.tax_amount or Decimal('0.00')) for inv in active_invoices)
    total_cgst = sum((inv.cgst_amount or Decimal('0.00')) for inv in active_invoices)
    total_sgst = sum((inv.sgst_amount or Decimal('0.00')) for inv in active_invoices)
    total_due = max(Decimal('0.00'), total_billed - total_paid)

    # -------------------------------------------------------------
    # 1. TAB 1: EXECUTIVE SUMMARY & KPIS
    # -------------------------------------------------------------
    if export_type in ['full', 'summary']:
        ws_sum = wb.create_sheet(title="Executive Summary")
        ws_sum.views.sheetView[0].showGridLines = True
        add_pharmacy_header(ws_sum, profile, f"SUMMARY & KPIs - {report_title}", filter_info, end_col_letter="H")

        # KPI Cards Block (Row 5 - 8)
        ws_sum.cell(row=5, column=1, value="FINANCIAL & RECONCILIATION SNAPSHOT").font = FONT_SECTION
        ws_sum.merge_cells("A5:H5")

        kpis = [
            ("Total Billed Sales", total_billed, FORMAT_CURRENCY, "E0E7FF", "3730A3"),
            ("Total Bills Count", len(active_invoices), FORMAT_INTEGER, "F1F5F9", "0F172A"),
            ("Cash in Drawer", total_cash, FORMAT_CURRENCY, "DCFCE7", "065F46"),
            ("UPI / GPay in Bank", total_upi, FORMAT_CURRENCY, "E0F2FE", "0369A1"),
            ("Card Payments", total_card, FORMAT_CURRENCY, "EDE9FE", "5B21B6"),
            ("Customer Dues (Credit)", total_due, FORMAT_CURRENCY, "FFE4E6", "9F1239"),
            ("Discounts Given", total_discount, FORMAT_CURRENCY, "FEF3C7", "92400E"),
            ("Total GST (CGST+SGST)", total_tax, FORMAT_CURRENCY, "FCE7F3", "9D174D"),
        ]

        # Render 2 rows x 4 cols of KPI blocks
        for i, (label, val, num_fmt, bg_hex, text_hex) in enumerate(kpis):
            r = 6 if i < 4 else 8
            c = (i % 4) * 2 + 1
            c_end = c + 1

            ws_sum.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c_end)
            lbl_cell = ws_sum.cell(row=r, column=c, value=label.upper())
            lbl_cell.font = Font(name="Calibri", size=8.5, bold=True, color=text_hex)
            lbl_cell.fill = PatternFill(start_color=bg_hex, end_color=bg_hex, fill_type="solid")
            lbl_cell.alignment = ALIGN_CENTER
            lbl_cell.border = BORDER_THIN
            ws_sum.cell(row=r, column=c_end).border = BORDER_THIN

            val_r = r + 1
            ws_sum.merge_cells(start_row=val_r, start_column=c, end_row=val_r, end_column=c_end)
            val_cell = ws_sum.cell(row=val_r, column=c, value=float(val))
            val_cell.font = Font(name="Calibri", size=13, bold=True, color=text_hex)
            val_cell.fill = PatternFill(start_color=bg_hex, end_color=bg_hex, fill_type="solid")
            val_cell.alignment = ALIGN_CENTER
            val_cell.number_format = num_fmt
            val_cell.border = BORDER_THIN
            ws_sum.cell(row=val_r, column=c_end).border = BORDER_THIN

        # Table 1: Staff Performance Breakdown
        cur_row = 12
        ws_sum.cell(row=cur_row, column=1, value="STAFF-WISE BILLING & COLLECTION BREAKDOWN").font = FONT_SECTION
        ws_sum.merge_cells(f"A{cur_row}:H{cur_row}")
        cur_row += 1

        staff_headers = ["Staff Code", "Staff Name", "Invoices Count", "Cash Collected (₹)", "UPI Collected (₹)", "Card Collected (₹)", "Total Collected (₹)", "Total Billed (₹)"]
        for col_idx, h in enumerate(staff_headers, start=1):
            cell = ws_sum.cell(row=cur_row, column=col_idx, value=h)
            cell.font = FONT_HEADER
            cell.fill = FILL_BRAND
            cell.alignment = ALIGN_HEADER
            cell.border = BORDER_THIN
        ws_sum.row_dimensions[cur_row].height = 24
        cur_row += 1

        # Aggregate staff stats
        staff_map = {}
        for inv in active_invoices:
            sc = inv.staff_code or 'SC-101'
            sn = inv.staff_name or 'Staff 1'
            if sc not in staff_map:
                staff_map[sc] = {'name': sn, 'count': 0, 'cash': Decimal('0.00'), 'upi': Decimal('0.00'), 'card': Decimal('0.00'), 'paid': Decimal('0.00'), 'total': Decimal('0.00')}
            staff_map[sc]['count'] += 1
            staff_map[sc]['cash'] += (inv.cash_amount or Decimal('0.00'))
            staff_map[sc]['upi'] += (inv.upi_amount or Decimal('0.00'))
            staff_map[sc]['card'] += (inv.card_amount or Decimal('0.00'))
            staff_map[sc]['paid'] += (inv.amount_paid or Decimal('0.00'))
            staff_map[sc]['total'] += (inv.grand_total or Decimal('0.00'))

        staff_start_row = cur_row
        for sc, sdata in sorted(staff_map.items()):
            row_data = [
                sc,
                sdata['name'],
                sdata['count'],
                float(sdata['cash']),
                float(sdata['upi']),
                float(sdata['card']),
                float(sdata['paid']),
                float(sdata['total']),
            ]
            for col_idx, val in enumerate(row_data, start=1):
                cell = ws_sum.cell(row=cur_row, column=col_idx, value=val)
                cell.font = FONT_DATA
                cell.border = BORDER_THIN
                if col_idx == 1:
                    cell.alignment = ALIGN_CENTER
                elif col_idx == 2:
                    cell.alignment = ALIGN_LEFT
                elif col_idx == 3:
                    cell.alignment = ALIGN_CENTER
                    cell.number_format = FORMAT_INTEGER
                else:
                    cell.alignment = ALIGN_RIGHT
                    cell.number_format = FORMAT_CURRENCY
            cur_row += 1

        # Staff Totals Row
        if staff_map:
            ws_sum.cell(row=cur_row, column=1, value="TOTALS").font = FONT_TOTAL
            ws_sum.cell(row=cur_row, column=1).alignment = ALIGN_CENTER
            ws_sum.cell(row=cur_row, column=1).border = BORDER_TOTAL
            ws_sum.cell(row=cur_row, column=1).fill = FILL_TOTAL

            ws_sum.cell(row=cur_row, column=2, value=f"{len(staff_map)} Staff Members").font = FONT_TOTAL
            ws_sum.cell(row=cur_row, column=2).alignment = ALIGN_LEFT
            ws_sum.cell(row=cur_row, column=2).border = BORDER_TOTAL
            ws_sum.cell(row=cur_row, column=2).fill = FILL_TOTAL

            for c_idx in range(3, 9):
                c_let = get_column_letter(c_idx)
                cell = ws_sum.cell(row=cur_row, column=c_idx)
                cell.value = f"=SUM({c_let}{staff_start_row}:{c_let}{cur_row-1})"
                cell.font = FONT_TOTAL
                cell.alignment = ALIGN_CENTER if c_idx == 3 else ALIGN_RIGHT
                cell.number_format = FORMAT_INTEGER if c_idx == 3 else FORMAT_CURRENCY
                cell.border = BORDER_TOTAL
                cell.fill = FILL_TOTAL
            cur_row += 1

        # Table 2: Payment Mode Breakdown
        cur_row += 2
        ws_sum.cell(row=cur_row, column=1, value="PAYMENT METHOD DISTRIBUTION").font = FONT_SECTION
        ws_sum.merge_cells(f"A{cur_row}:E{cur_row}")
        cur_row += 1

        pay_headers = ["Payment Mode", "Bills Count", "Total Billed (₹)", "% of Total Sales", "Collection Notes"]
        for col_idx, h in enumerate(pay_headers, start=1):
            cell = ws_sum.cell(row=cur_row, column=col_idx, value=h)
            cell.font = FONT_HEADER
            cell.fill = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
            cell.alignment = ALIGN_HEADER
            cell.border = BORDER_THIN
        ws_sum.row_dimensions[cur_row].height = 24
        cur_row += 1

        # Group by payment method
        pay_methods = [
            ('CASH', 'Cash Counter Payments', 'Physical cash received in drawer'),
            ('UPI', 'UPI / QR Code (GPay / PhonePe)', 'Direct bank transfer via dynamic QR'),
            ('CARD', 'Debit / Credit Card POS', 'POS terminal swipe / tap'),
            ('MIXED', 'Split Payments (Cash + UPI)', 'Combination of cash and digital QR'),
            ('CREDIT', 'Credit Account / Due', 'Unpaid customer balance'),
        ]
        for pcode, plabel, pnote in pay_methods:
            p_invs = [inv for inv in active_invoices if inv.payment_method == pcode]
            p_total = sum((inv.grand_total or Decimal('0.00')) for inv in p_invs)
            p_pct = (float(p_total) / float(total_billed) * 100.0) if total_billed > 0 else 0.0

            row_data = [
                plabel,
                len(p_invs),
                float(p_total),
                p_pct / 100.0,
                pnote
            ]
            for col_idx, val in enumerate(row_data, start=1):
                cell = ws_sum.cell(row=cur_row, column=col_idx, value=val)
                cell.font = FONT_DATA
                cell.border = BORDER_THIN
                if col_idx == 1:
                    cell.alignment = ALIGN_LEFT
                elif col_idx == 2:
                    cell.alignment = ALIGN_CENTER
                    cell.number_format = FORMAT_INTEGER
                elif col_idx == 3:
                    cell.alignment = ALIGN_RIGHT
                    cell.number_format = FORMAT_CURRENCY
                elif col_idx == 4:
                    cell.alignment = ALIGN_RIGHT
                    cell.number_format = FORMAT_PERCENT
                else:
                    cell.alignment = ALIGN_LEFT
            cur_row += 1

        auto_fit_columns(ws_sum)

    # -------------------------------------------------------------
    # 2. TAB 2: BILLS LEDGER ARCHIVE
    # -------------------------------------------------------------
    if export_type in ['full', 'ledger']:
        ws_led = wb.create_sheet(title="Bills Ledger")
        ws_led.views.sheetView[0].showGridLines = True
        add_pharmacy_header(ws_led, profile, f"BILLS LEDGER - {report_title}", filter_info, end_col_letter="X")

        ledger_headers = [
            "S.No",
            "Bill Number",
            "Date",
            "Time",
            "Customer / Patient",
            "Contact Phone",
            "Doctor",
            "Staff Code",
            "Staff Name",
            "Payment Mode",
            "Subtotal (₹)",
            "Discount (₹)",
            "Taxable Amt (₹)",
            "CGST (₹)",
            "SGST (₹)",
            "Total GST (₹)",
            "Round Off (₹)",
            "Grand Total (₹)",
            "Amount Paid (₹)",
            "Cash Received (₹)",
            "UPI Received (₹)",
            "Card Received (₹)",
            "Due Balance (₹)",
            "Payment Status"
        ]

        header_row = 5
        for col_idx, h in enumerate(ledger_headers, start=1):
            cell = ws_led.cell(row=header_row, column=col_idx, value=h)
            cell.font = FONT_HEADER
            cell.fill = FILL_BRAND
            cell.alignment = ALIGN_HEADER
            cell.border = BORDER_THIN
        ws_led.row_dimensions[header_row].height = 28

        cur_row = 6
        start_data_row = cur_row

        for idx, inv in enumerate(invoices, start=1):
            is_cancelled = inv.payment_status in ['CANCELLED', 'REFUNDED']
            created = timezone.localtime(inv.created_at) if hasattr(timezone, 'localtime') and inv.created_at else inv.created_at
            date_str = created.strftime('%d-%m-%Y') if created else ''
            time_str = created.strftime('%I:%M %p') if created else ''

            subtotal_val = float(inv.subtotal or inv.grand_total or 0.0)
            disc_val = float(inv.discount_amount or 0.0)
            taxable_val = max(0.0, subtotal_val - disc_val)
            cgst_val = float(inv.cgst_amount or 0.0)
            sgst_val = float(inv.sgst_amount or 0.0)
            tot_tax_val = float(inv.tax_amount or 0.0)
            round_val = float(inv.round_off or 0.0)
            gt_val = float(inv.grand_total or 0.0)
            paid_val = float(inv.amount_paid or 0.0)
            cash_val = float(inv.cash_amount or 0.0)
            upi_val = float(inv.upi_amount or 0.0)
            card_val = float(inv.card_amount or 0.0)
            due_val = max(0.0, gt_val - paid_val) if not is_cancelled else 0.0

            row_values = [
                idx,
                inv.invoice_number,
                date_str,
                time_str,
                inv.customer_name or 'Walk-in Customer',
                inv.customer_phone or '-',
                inv.doctor_name or 'OTC / Self',
                inv.staff_code or 'SC-101',
                inv.staff_name or 'Staff 1',
                inv.payment_method,
                subtotal_val,
                disc_val,
                taxable_val,
                cgst_val,
                sgst_val,
                tot_tax_val,
                round_val,
                gt_val,
                paid_val,
                cash_val,
                upi_val,
                card_val,
                due_val,
                inv.payment_status
            ]

            fill_to_use = PatternFill(start_color="FFE4E6", end_color="FFE4E6", fill_type="solid") if is_cancelled else (FILL_ZEBRA if idx % 2 == 0 else None)

            for col_idx, val in enumerate(row_values, start=1):
                cell = ws_led.cell(row=cur_row, column=col_idx, value=val)
                cell.font = FONT_DATA
                cell.border = BORDER_THIN
                if fill_to_use:
                    cell.fill = fill_to_use

                # Alignments & formats
                if col_idx in [1, 3, 4, 8, 10, 24]:
                    cell.alignment = ALIGN_CENTER
                elif col_idx in [2, 5, 6, 7, 9]:
                    cell.alignment = ALIGN_LEFT
                else:
                    cell.alignment = ALIGN_RIGHT
                    cell.number_format = FORMAT_CURRENCY
            cur_row += 1

        # Totals Summary Row
        if invoices:
            ws_led.cell(row=cur_row, column=1, value="TOTAL").font = FONT_TOTAL
            ws_led.cell(row=cur_row, column=1).alignment = ALIGN_CENTER
            ws_led.cell(row=cur_row, column=1).border = BORDER_TOTAL
            ws_led.cell(row=cur_row, column=1).fill = FILL_TOTAL

            ws_led.merge_cells(start_row=cur_row, start_column=2, end_row=cur_row, end_column=10)
            sum_lbl = ws_led.cell(row=cur_row, column=2, value=f"{len(invoices)} Total Invoices Recorded")
            sum_lbl.font = FONT_TOTAL
            sum_lbl.alignment = ALIGN_LEFT
            sum_lbl.border = BORDER_TOTAL
            sum_lbl.fill = FILL_TOTAL
            for c in range(3, 11):
                ws_led.cell(row=cur_row, column=c).border = BORDER_TOTAL
                ws_led.cell(row=cur_row, column=c).fill = FILL_TOTAL

            # SUM Formulas for numeric columns 11 to 23
            for c_idx in range(11, 24):
                c_let = get_column_letter(c_idx)
                cell = ws_led.cell(row=cur_row, column=c_idx)
                cell.value = f"=SUM({c_let}{start_data_row}:{c_let}{cur_row-1})"
                cell.font = FONT_TOTAL
                cell.alignment = ALIGN_RIGHT
                cell.number_format = FORMAT_CURRENCY
                cell.border = BORDER_TOTAL
                cell.fill = FILL_TOTAL

            ws_led.cell(row=cur_row, column=24, value="").border = BORDER_TOTAL
            ws_led.cell(row=cur_row, column=24).fill = FILL_TOTAL

        auto_fit_columns(ws_led)

    # -------------------------------------------------------------
    # 3. TAB 3: ITEMIZED MEDICINE SALES DETAILS
    # -------------------------------------------------------------
    if export_type in ['full', 'items']:
        ws_items = wb.create_sheet(title="Itemized Sales")
        ws_items.views.sheetView[0].showGridLines = True
        add_pharmacy_header(ws_items, profile, f"DISPENSED MEDICINES - {report_title}", filter_info, end_col_letter="W")

        items_headers = [
            "S.No",
            "Bill Number",
            "Bill Date & Time",
            "Customer / Patient",
            "Staff Code",
            "Medicine Name",
            "Batch Number",
            "Expiry Date",
            "HSN Code",
            "Sold As",
            "Qty Sold",
            "Pack Size",
            "Unit MRP (₹)",
            "Unit Selling (₹)",
            "Discount %",
            "Taxable Value (₹)",
            "GST Rate %",
            "CGST (₹)",
            "SGST (₹)",
            "Total Tax (₹)",
            "Line Total (₹)",
            "Payment Mode",
            "Bill Status"
        ]

        header_row = 5
        for col_idx, h in enumerate(items_headers, start=1):
            cell = ws_items.cell(row=header_row, column=col_idx, value=h)
            cell.font = FONT_HEADER
            cell.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
            cell.alignment = ALIGN_HEADER
            cell.border = BORDER_THIN
        ws_items.row_dimensions[header_row].height = 28

        cur_row = 6
        start_items_row = cur_row
        item_count = 0

        for inv in invoices:
            is_cancelled = inv.payment_status in ['CANCELLED', 'REFUNDED']
            created = timezone.localtime(inv.created_at) if hasattr(timezone, 'localtime') and inv.created_at else inv.created_at
            dt_str = created.strftime('%d-%m-%Y %I:%M %p') if created else ''

            for item in inv.items.all():
                item_count += 1
                qty = item.quantity
                unit_type = "Units (Loose)" if item.is_loose else "Packs"
                mrp_val = float(item.unit_mrp or 0.0)
                sp_val = float(item.unit_selling_price or 0.0)
                disc_pct = float(item.discount_percent or 0.0)
                gst_pct = float(item.gst_rate or 12.0)
                line_total = float(item.total_amount or 0.0)
                
                # Tax calculations
                tax_val = float(item.tax_amount or 0.0)
                taxable_val = max(0.0, line_total - tax_val)
                cgst_val = round(tax_val / 2.0, 2)
                sgst_val = round(tax_val - cgst_val, 2)

                exp_str = item.expiry_date.strftime('%m/%Y') if item.expiry_date else ''

                row_values = [
                    item_count,
                    inv.invoice_number,
                    dt_str,
                    inv.customer_name or 'Walk-in',
                    inv.staff_code or 'SC-101',
                    item.medicine_name,
                    item.batch_number or 'N/A',
                    exp_str,
                    item.hsn_code or '3004',
                    unit_type,
                    qty,
                    item.pack_size or 10,
                    mrp_val,
                    sp_val,
                    disc_pct / 100.0,
                    taxable_val,
                    gst_pct / 100.0,
                    cgst_val,
                    sgst_val,
                    tax_val,
                    line_total,
                    inv.payment_method,
                    inv.payment_status
                ]

                fill_to_use = PatternFill(start_color="FFE4E6", end_color="FFE4E6", fill_type="solid") if is_cancelled else (FILL_ZEBRA if item_count % 2 == 0 else None)

                for col_idx, val in enumerate(row_values, start=1):
                    cell = ws_items.cell(row=cur_row, column=col_idx, value=val)
                    cell.font = FONT_DATA
                    cell.border = BORDER_THIN
                    if fill_to_use:
                        cell.fill = fill_to_use

                    # Alignments & formats
                    if col_idx in [1, 3, 5, 7, 8, 9, 10, 22, 23]:
                        cell.alignment = ALIGN_CENTER
                    elif col_idx in [2, 4, 6]:
                        cell.alignment = ALIGN_LEFT
                    elif col_idx in [11, 12]:
                        cell.alignment = ALIGN_CENTER
                        cell.number_format = FORMAT_INTEGER
                    elif col_idx in [15, 17]:
                        cell.alignment = ALIGN_RIGHT
                        cell.number_format = FORMAT_PERCENT
                    else:
                        cell.alignment = ALIGN_RIGHT
                        cell.number_format = FORMAT_CURRENCY
                cur_row += 1

        # Itemized Summary Row
        if item_count > 0:
            ws_items.cell(row=cur_row, column=1, value="TOTAL").font = FONT_TOTAL
            ws_items.cell(row=cur_row, column=1).alignment = ALIGN_CENTER
            ws_items.cell(row=cur_row, column=1).border = BORDER_TOTAL
            ws_items.cell(row=cur_row, column=1).fill = FILL_TOTAL

            ws_items.merge_cells(start_row=cur_row, start_column=2, end_row=cur_row, end_column=10)
            items_lbl = ws_items.cell(row=cur_row, column=2, value=f"{item_count} Dispensed Medicine Line Items")
            items_lbl.font = FONT_TOTAL
            items_lbl.alignment = ALIGN_LEFT
            items_lbl.border = BORDER_TOTAL
            items_lbl.fill = FILL_TOTAL
            for c in range(3, 11):
                ws_items.cell(row=cur_row, column=c).border = BORDER_TOTAL
                ws_items.cell(row=cur_row, column=c).fill = FILL_TOTAL

            # Qty SUM
            qty_cell = ws_items.cell(row=cur_row, column=11)
            qty_cell.value = f"=SUM(K{start_items_row}:K{cur_row-1})"
            qty_cell.font = FONT_TOTAL
            qty_cell.alignment = ALIGN_CENTER
            qty_cell.number_format = FORMAT_INTEGER
            qty_cell.border = BORDER_TOTAL
            qty_cell.fill = FILL_TOTAL

            for c_idx in [12, 13, 14, 15]:
                ws_items.cell(row=cur_row, column=c_idx, value="").border = BORDER_TOTAL
                ws_items.cell(row=cur_row, column=c_idx).fill = FILL_TOTAL

            # SUM for Taxable, CGST, SGST, Tax, Line Total
            for c_idx in [16, 18, 19, 20, 21]:
                c_let = get_column_letter(c_idx)
                cell = ws_items.cell(row=cur_row, column=c_idx)
                cell.value = f"=SUM({c_let}{start_items_row}:{c_let}{cur_row-1})"
                cell.font = FONT_TOTAL
                cell.alignment = ALIGN_RIGHT
                cell.number_format = FORMAT_CURRENCY
                cell.border = BORDER_TOTAL
                cell.fill = FILL_TOTAL

            for c_idx in [17, 22, 23]:
                ws_items.cell(row=cur_row, column=c_idx, value="").border = BORDER_TOTAL
                ws_items.cell(row=cur_row, column=c_idx).fill = FILL_TOTAL

        auto_fit_columns(ws_items)

    # Save to in-memory buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
