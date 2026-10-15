import io
import os
from decimal import Decimal
from datetime import datetime, date
from django.utils import timezone

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak, HRFlowable, Image as RLImage
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw total page count
    and branded running headers / footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        width, height = self._pagesize

        # Running Footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(36, 32, width - 36, 32)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        
        footer_left = "Top Medical Pharmacy  |  Monthly Financial Statement & Cash/UPI Register  |  Confidential"
        self.drawString(36, 20, footer_left)

        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(width - 36, 20, page_str)

        self.restoreState()


def format_inr(val, show_sign=False):
    """Formats a numeric or Decimal value into Indian Rupee string format with explicit minus sign."""
    try:
        f = float(val or 0.0)
        is_neg = f < 0
        abs_f = abs(f)
        formatted = f"{abs_f:,.2f}"
        if is_neg:
            return f"-{formatted}"
        elif show_sign and f > 0:
            return f"+{formatted}"
        return formatted
    except (ValueError, TypeError):
        return "0.00"


def format_inr_curr(val, currency="₹", show_sign=False):
    """Formats currency values placing the minus sign properly before currency: e.g. -₹ 19,145.00"""
    try:
        f = float(val or 0.0)
        is_neg = f < 0
        abs_f = abs(f)
        formatted = f"{abs_f:,.2f}"
        if is_neg:
            return f"-{currency} {formatted}"
        elif show_sign and f > 0:
            return f"+{currency} {formatted}"
        return f"{currency} {formatted}"
    except (ValueError, TypeError):
        return f"{currency} 0.00"


def get_reconciled_finance_ledger(month=None, year=None, start_date=None, end_date=None):
    """
    Dynamically loads and reconciles live POS Invoices, Daily Financial Records,
    and Vendor Bill Payment audits from the database into an accurate day-by-day statement.
    Seamlessly chains opening and closing balances across all historical months.
    """
    from billing.models import Invoice, DailyFinanceRecord, VendorBill
    from django.db.models import Sum, Count, Q
    from calendar import monthrange
    
    cur_year = int(year) if year else timezone.now().year
    cur_month = int(month) if month else None
    
    # 1. Determine period date boundaries
    period_start = None
    period_end = None
    
    if cur_month:
        period_start = date(cur_year, cur_month, 1)
        _, last_day = monthrange(cur_year, cur_month)
        period_end = date(cur_year, cur_month, last_day)
    elif start_date:
        if isinstance(start_date, str):
            try:
                period_start = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                period_start = date.today()
        else:
            period_start = start_date
            
        if end_date:
            if isinstance(end_date, str):
                try:
                    period_end = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    period_end = date.today()
            else:
                period_end = end_date
        else:
            period_end = date.today()

    # 2. Compute historical cumulative starting opening balance prior to period_start
    if period_start:
        prior_df = DailyFinanceRecord.objects.filter(date__lt=period_start).order_by('-date').first()
        if prior_df:
            starting_opening_balance = prior_df.closing_balance
        else:
            prior_invoices = Invoice.objects.filter(
                created_at__date__lt=period_start
            ).exclude(payment_status__in=['CANCELLED', 'REFUNDED'])
            
            prior_cash = prior_invoices.aggregate(s=Sum('cash_amount'))['s'] or Decimal('0.00')
            prior_upi = prior_invoices.aggregate(s=Sum('upi_amount'))['s'] or Decimal('0.00')
            prior_earned = prior_cash + prior_upi
            
            prior_paid = DailyFinanceRecord.objects.filter(
                date__lt=period_start
            ).aggregate(s=Sum('total_paid'))['s'] or Decimal('0.00')
            
            starting_opening_balance = prior_earned - prior_paid
    else:
        first_df = DailyFinanceRecord.objects.all().order_by('date').first()
        starting_opening_balance = first_df.opening_balance if first_df else Decimal('0.00')

    # 3. Base Query Filters for active period
    inv_q = Q()
    df_q = Q()
    
    if period_start and period_end:
        inv_q &= Q(created_at__date__gte=period_start, created_at__date__lte=period_end)
        df_q &= Q(date__gte=period_start, date__lte=period_end)
    elif cur_month:
        inv_q &= Q(created_at__year=cur_year, created_at__month=cur_month)
        df_q &= Q(date__year=cur_year, date__month=cur_month)
            
    # 4. Fetch live POS invoices aggregated by date
    invoices_qs = Invoice.objects.filter(inv_q).exclude(payment_status__in=['CANCELLED', 'REFUNDED'])
    inv_by_date = {}
    for item in invoices_qs.values('created_at__date').annotate(
        sales=Sum('grand_total'),
        cash=Sum('cash_amount'),
        upi=Sum('upi_amount'),
        card=Sum('card_amount'),
        count=Count('id')
    ):
        inv_by_date[item['created_at__date']] = item
        
    # 5. Fetch DailyFinanceRecord entries
    df_qs = DailyFinanceRecord.objects.filter(df_q).order_by('date')
    df_by_date = {r.date: r for r in df_qs}
    
    # 6. Determine all active trading/financial dates in period (Union of POS Invoices and Daily Accounts Records)
    all_dates = sorted(set(df_by_date.keys()) | set(inv_by_date.keys()))
    if len(all_dates) > 0:
        first_d = all_dates[0]
        if first_d in df_by_date and df_by_date[first_d].opening_balance is not None:
            starting_opening_balance = df_by_date[first_d].opening_balance

    reconciled_rows = []
    running_balance = starting_opening_balance
    
    for d in all_dates:
        inv = inv_by_date.get(d)
        df = df_by_date.get(d)
        
        # Inflow: Use saved DailyFinanceRecord if present, or live POS invoices if no DF record exists
        if df:
            sales = Decimal(str(df.daily_sales or '0.00'))
            cash = Decimal(str(df.cash_earned or '0.00'))
            upi = Decimal(str(df.upi_earned or '0.00'))
            capital = Decimal(str(getattr(df, 'capital_investment', 0) or '0.00'))
            if sales == Decimal('0.00') and inv:
                sales = Decimal(str(inv['sales'] or '0.00'))
            if cash == Decimal('0.00') and upi == Decimal('0.00') and inv:
                cash = Decimal(str(inv['cash'] or '0.00'))
                upi = Decimal(str(inv['upi'] or '0.00'))
            invoices_count = inv['count'] if inv else 0
            
            earned = Decimal(str(df.total_earned or (cash + upi + capital)))
            supp = Decimal(str(df.supplier_payments or '0.00'))
            staff = Decimal(str(getattr(df, 'staff_expenses', 0) or '0.00'))
            veh = Decimal(str(getattr(df, 'vehicle_expenses', 0) or '0.00'))
            exp = Decimal(str(df.expenses or '0.00'))
            oth = Decimal(str(df.other_outflow or '0.00'))
            paid = Decimal(str(df.total_paid or (supp + staff + veh + exp + oth)))
            
            open_bal = Decimal(str(df.opening_balance or running_balance))
            net_change = Decimal(str(df.net_day_change or (earned - paid)))
            closing_bal = Decimal(str(df.closing_balance or (open_bal + net_change)))
            running_balance = closing_bal
        elif inv:
            sales = Decimal(str(inv['sales'] or '0.00'))
            cash = Decimal(str(inv['cash'] or '0.00'))
            upi = Decimal(str(inv['upi'] or '0.00'))
            capital = Decimal('0.00')
            invoices_count = inv['count']
            earned = cash + upi
            supp = Decimal('0.00')
            staff = Decimal('0.00')
            veh = Decimal('0.00')
            exp = Decimal('0.00')
            oth = Decimal('0.00')
            paid = Decimal('0.00')
            open_bal = running_balance
            net_change = earned - paid
            closing_bal = open_bal + net_change
            running_balance = closing_bal
        else:
            sales = Decimal('0.00')
            cash = Decimal('0.00')
            upi = Decimal('0.00')
            capital = Decimal('0.00')
            invoices_count = 0
            earned = Decimal('0.00')
            supp = Decimal('0.00')
            staff = Decimal('0.00')
            veh = Decimal('0.00')
            exp = Decimal('0.00')
            oth = Decimal('0.00')
            paid = Decimal('0.00')
            open_bal = running_balance
            net_change = Decimal('0.00')
            closing_bal = open_bal
            running_balance = closing_bal
        
        details = df.payment_details if (df and isinstance(df.payment_details, list)) else []
        notes = (df.notes or '') if df else ''
        
        reconciled_rows.append({
            'date': d,
            'daily_sales': sales,
            'cash_earned': cash,
            'upi_earned': upi,
            'capital_investment': capital,
            'total_earned': earned,
            'supplier_payments': supp,
            'staff_expenses': staff,
            'vehicle_expenses': veh,
            'expenses': exp,
            'other_outflow': oth,
            'total_paid': paid,
            'opening_balance': open_bal,
            'net_day_change': net_change,
            'closing_balance': closing_bal,
            'payment_details': details,
            'notes': notes,
            'invoices_count': invoices_count
        })
        
    return reconciled_rows


def generate_monthly_finance_pdf(records_qs=None, profile=None, filter_info="", month=None, year=None, report_title="MONTHLY FINANCIAL STATEMENT & CASH/UPI AUDIT", reconciled_data=None, section="all"):
    """
    Generates a professional, print-ready, high-resolution PDF report of the Monthly Financial Register,
    dynamically loaded and reconciled directly from POS Invoices and Daily Finance records.
    Supports granular section downloads: 'daily_statement' (register only), 'payments' (payouts only), or 'all'.
    """
    sec = (section or 'all').lower().strip()
    include_register = sec not in ['payments', 'outflows', 'expenses', 'vouchers']
    include_payments = sec not in ['daily_statement', 'register', 'overview', 'daily']

    if not include_payments and include_register:
        if report_title == "MONTHLY FINANCIAL STATEMENT & CASH/UPI AUDIT":
            report_title = "MONTHLY FINANCIAL STATEMENT & DAILY REGISTER"
    elif not include_register and include_payments:
        if report_title == "MONTHLY FINANCIAL STATEMENT & CASH/UPI AUDIT":
            report_title = "MONTHLY PAYMENT HISTORY & OUTFLOW AUDIT"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=42
    )

    currency = getattr(profile, 'currency_symbol', '₹') or '₹'
    pharmacy_name = getattr(profile, 'name', 'TOP MEDICAL PHARMACY') or 'TOP MEDICAL PHARMACY'
    address = getattr(profile, 'address', '3-79/4, R.B.Complex, University Road, Deralakatte, Mangalore 575018') or ''
    phone = getattr(profile, 'phone', '9148240793') or ''
    gstin = getattr(profile, 'gstin', '29AJPPU6288G1Z7') or ''
    dl_20b = getattr(profile, 'dl_number_20b', 'KA-MN1-300667') or ''
    dl_21b = getattr(profile, 'dl_number_21b', 'KA-MN1-300667') or ''

    # Color Palette Constants (System Default Theme)
    c_white = colors.HexColor("#FFFFFF")
    c_bg_subtle = colors.HexColor("#F8FAFC")
    c_slate_dark = colors.HexColor("#0F172A")
    c_navy = colors.HexColor("#0F172A")
    c_slate_text = colors.HexColor("#334155")
    c_slate_muted = colors.HexColor("#64748B")
    c_slate_light = colors.HexColor("#94A3B8")
    c_border = colors.HexColor("#CBD5E1")
    c_border_subtle = colors.HexColor("#E2E8F0")

    # Primary Medical Brand Colors
    c_brand = colors.HexColor("#0284C7")          # Ocean Blue
    c_brand_dark = colors.HexColor("#0369A1")     # Deep Ocean
    c_brand_bg = colors.HexColor("#F0F9FF")       # Soft Blue Tint
    c_emerald = colors.HexColor("#059669")        # Primary Medical Emerald
    c_emerald_dark = colors.HexColor("#047857")
    c_emerald_bg = colors.HexColor("#ECFDF5")     # Soft Emerald Tint
    c_indigo = colors.HexColor("#4F46E5")         # Indigo (UPI)
    c_indigo_bg = colors.HexColor("#EEF2FF")
    c_rose = colors.HexColor("#DC2626")           # Rose (Outflows / Deficit)
    c_rose_bg = colors.HexColor("#FEF2F2")
    c_amber = colors.HexColor("#D97706")
    c_amber_bg = colors.HexColor("#FFFBEB")
    c_zebra = colors.HexColor("#F8FAFC")
    c_total_bg = colors.HexColor("#F0FDF4")

    styles = getSampleStyleSheet()
    
    style_brand_title = ParagraphStyle(
        'DocBrandTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=c_slate_dark
    )
    style_brand_portal = ParagraphStyle(
        'DocBrandPortal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=c_emerald
    )
    style_brand_meta = ParagraphStyle(
        'DocBrandMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.5,
        textColor=c_slate_muted
    )
    style_report_title = ParagraphStyle(
        'DocReportTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=c_brand,
        alignment=2
    )
    style_report_meta = ParagraphStyle(
        'DocReportMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.5,
        textColor=c_slate_muted,
        alignment=2
    )
    style_section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=c_slate_dark,
        spaceBefore=8,
        spaceAfter=4
    )
    style_th = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=6.8,
        leading=8.5,
        textColor=colors.HexColor("#475569"),
        alignment=1
    )
    style_td_center = ParagraphStyle(
        'TableCellCenter',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=8.5,
        textColor=c_slate_text,
        alignment=1
    )
    style_td_left = ParagraphStyle(
        'TableCellLeft',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=8.5,
        textColor=c_slate_text,
        alignment=0
    )
    style_td_right = ParagraphStyle(
        'TableCellRight',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=8.5,
        textColor=c_slate_text,
        alignment=2
    )
    style_td_bold_right = ParagraphStyle(
        'TableCellBoldRight',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=8.5,
        textColor=c_slate_text,
        alignment=2
    )
    style_td_total = ParagraphStyle(
        'TableCellTotal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.2,
        leading=9,
        textColor=c_slate_dark,
        alignment=2
    )
    style_td_total_label = ParagraphStyle(
        'TableCellTotalLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.2,
        leading=9,
        textColor=c_slate_dark,
        alignment=1
    )
    style_card_title = ParagraphStyle(
        'CardTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9,
        textColor=c_slate_muted,
        alignment=1
    )
    style_card_val = ParagraphStyle(
        'CardVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=13,
        textColor=c_slate_dark,
        alignment=1
    )
    style_card_sub = ParagraphStyle(
        'CardSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.5,
        leading=8,
        textColor=c_slate_muted,
        alignment=1
    )

    story = []

    # 1. Official Header Card with Pharmacy Branding (Matching System Default Theme)
    logo_path = None
    possible_paths = [
        os.path.join(os.path.dirname(__file__), 'static', 'img', 'logo_top.png'),
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'frontend', 'src', 'assets', 'logo_top.png')),
    ]
    for p in possible_paths:
        if os.path.exists(p):
            logo_path = p
            break

    gen_time_str = timezone.now().strftime('%d-%b-%Y %I:%M %p')
    period_str = filter_info or (f"Month: {datetime(year or timezone.now().year, month or timezone.now().month, 1).strftime('%B %Y')}" if month else "All Recorded Dates")

    brand_info_flowables = [
        Paragraph(f"<b>{pharmacy_name.upper()}</b>", style_brand_title),
        Paragraph("<font color='#059669'><b>&#9679; Admin Portal</b></font> &nbsp;<font color='#64748B'>| Live Financial Statement &amp; Cash/UPI Audit</font>", style_brand_portal),
        Paragraph(f"<font color='#059669'><b>DL:</b> {dl_20b}</font> &nbsp;&bull;&nbsp; <font color='#0284C7'><b>GSTIN:</b> {gstin}</font> &nbsp;&bull;&nbsp; <font color='#334155'><b>Phone:</b> {phone}</font>", style_brand_meta),
        Paragraph(f"{address}", style_brand_meta)
    ]

    report_meta_flowables = [
        Paragraph(f"<b>{report_title}</b>", style_report_title),
        Paragraph(f"<b>REPORT PERIOD:</b> <font color='#0F172A'>{period_str.upper()}</font>", style_report_meta),
        Paragraph(f"<b>GENERATED:</b> {gen_time_str} &nbsp;|&nbsp; <b>CURRENCY:</b> INR ({currency})", style_report_meta),
        Paragraph("<font color='#059669'><b>SOURCE:</b> LIVE DATABASE &nbsp;|&nbsp; 100% RECONCILED</font>", style_report_meta)
    ]

    if logo_path:
        logo_img = RLImage(logo_path, width=32, height=32)
        header_table_data = [[
            logo_img,
            brand_info_flowables,
            report_meta_flowables
        ]]
        header_table = Table(header_table_data, colWidths=[38, 442, 290])
    else:
        header_table_data = [[
            brand_info_flowables,
            report_meta_flowables
        ]]
        header_table = Table(header_table_data, colWidths=[480, 290])

    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_white),
        ('BOX', (0, 0), (-1, -1), 0.75, c_border),
        ('LINEABOVE', (0, 0), (-1, 0), 2.5, c_brand),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))

    # Dynamically obtain reconciled data if not provided
    if reconciled_data is not None:
        records_list = reconciled_data
    else:
        records_list = get_reconciled_finance_ledger(month=month, year=year)

    # Calculate Aggregates
    tot_sales = Decimal('0.00')
    tot_cash = Decimal('0.00')
    tot_upi = Decimal('0.00')
    tot_earned = Decimal('0.00')
    tot_paid = Decimal('0.00')
    tot_supp = Decimal('0.00')
    tot_staff = Decimal('0.00')
    tot_veh = Decimal('0.00')
    tot_exp = Decimal('0.00')
    tot_oth = Decimal('0.00')
    tot_invoices = 0
    all_payment_items = []

    opening_bal = Decimal('0.00')
    closing_bal = Decimal('0.00')

    if len(records_list) > 0:
        opening_bal = Decimal(str(records_list[0].get('opening_balance') or '0.00'))
        closing_bal = Decimal(str(records_list[-1].get('closing_balance') or '0.00'))

    for r in records_list:
        s = Decimal(str(r.get('daily_sales') or '0.00'))
        c = Decimal(str(r.get('cash_earned') or '0.00'))
        u = Decimal(str(r.get('upi_earned') or '0.00'))
        e = Decimal(str(r.get('total_earned') or (c + u)))
        p = Decimal(str(r.get('total_paid') or '0.00'))
        supp = Decimal(str(r.get('supplier_payments') or '0.00'))
        stf = Decimal(str(r.get('staff_expenses') or '0.00'))
        veh = Decimal(str(r.get('vehicle_expenses') or '0.00'))
        exp = Decimal(str(r.get('expenses') or '0.00'))
        oth = Decimal(str(r.get('other_outflow') or '0.00'))
        inv_cnt = int(r.get('invoices_count') or 0)

        tot_sales += s
        tot_cash += c
        tot_upi += u
        tot_earned += e
        tot_paid += p
        tot_supp += supp
        tot_staff += stf
        tot_veh += veh
        tot_exp += exp
        tot_oth += oth
        tot_invoices += inv_cnt

        # Extract payment items
        details = r.get('payment_details') if isinstance(r.get('payment_details'), list) else []
        for idx, item in enumerate(details):
            amt = Decimal(str(item.get('amount') or '0.00'))
            if amt > Decimal('0.00'):
                all_payment_items.append({
                    'date': r.get('date'),
                    'type': (item.get('type') or 'EXPENSE').upper(),
                    'recipient': item.get('recipient') or item.get('staff_name') or item.get('vehicle_info') or item.get('category') or 'Disbursement',
                    'charge_code': item.get('charge_code') or item.get('staff_code') or '',
                    'mode': (item.get('payment_mode') or 'CASH').upper(),
                    'ref': item.get('note') or item.get('purpose') or item.get('bill_number') or f"Ref #{idx+1}",
                    'amount': amt
                })

    net_change = tot_earned - tot_paid

    is_closing_neg = closing_bal < Decimal('0.00')
    is_opening_neg = opening_bal < Decimal('0.00')
    is_net_neg = net_change < Decimal('0.00')

    closing_color = "#DC2626" if is_closing_neg else "#0C4A6E"
    closing_bg = colors.HexColor("#FEF2F2") if is_closing_neg else colors.HexColor("#F0FDF4")
    closing_box = colors.HexColor("#FCA5A5") if is_closing_neg else colors.HexColor("#86EFAC")
    closing_status = "Deficit / Minus Balance" if is_closing_neg else "Healthy Surplus"

    kpi_card_4_bg = colors.HexColor("#FEF2F2") if is_net_neg else c_indigo_bg
    kpi_card_4_box = colors.HexColor("#FECDD3") if is_net_neg else colors.HexColor("#C7D2FE")
    kpi_card_4_color = "#DC2626" if is_net_neg else "#3730A3"
    kpi_card_4_title = "NET CASH DEFICIT" if is_net_neg else "NET CASH SURPLUS"

    # 2. Executive KPI Summary Matrix (Cards in Table format matching System Default Theme)
    if not include_register and include_payments:
        # Payout / Disbursement focused KPI cards for Payment Audit
        kpi_card_1 = [
            Paragraph("TOTAL OUTFLOW (PAID)", style_card_title),
            Paragraph(f"<font color='#DC2626'><b>{currency} {format_inr(tot_paid)}</b></font>", style_card_val),
            Paragraph(f"{len(all_payment_items)} Payout Entries Recorded", style_card_sub)
        ]
        kpi_card_2 = [
            Paragraph("WHOLESALE SUPPLIERS", style_card_title),
            Paragraph(f"<font color='#0284C7'><b>{currency} {format_inr(tot_supp)}</b></font>", style_card_val),
            Paragraph("Vendor & Stock Invoices", style_card_sub)
        ]
        kpi_card_3 = [
            Paragraph("STAFF & SALARIES", style_card_title),
            Paragraph(f"<font color='#4F46E5'><b>{currency} {format_inr(tot_staff)}</b></font>", style_card_val),
            Paragraph("Wages, Allowances & Tea", style_card_sub)
        ]
        kpi_card_4 = [
            Paragraph("SHOP & OPS EXPENSES", style_card_title),
            Paragraph(f"<font color='#D97706'><b>{currency} {format_inr(tot_exp + tot_oth)}</b></font>", style_card_val),
            Paragraph("Rent, Electric & Utilities", style_card_sub)
        ]
        kpi_card_5 = [
            Paragraph("VEHICLE & DELIVERY", style_card_title),
            Paragraph(f"<font color='#059669'><b>{currency} {format_inr(tot_veh)}</b></font>", style_card_val),
            Paragraph("Fuel & Local Delivery", style_card_sub)
        ]
        kpi_table_data = [[kpi_card_1, kpi_card_2, kpi_card_3, kpi_card_4, kpi_card_5]]
        col_w = 770 / 5.0
        kpi_table = Table(kpi_table_data, colWidths=[col_w] * 5)
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), c_white),
            ('BOX', (0, 0), (-1, -1), 0.75, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border_subtle),
            ('LINEABOVE', (0, 0), (0, 0), 2.5, colors.HexColor("#EF4444")),
            ('LINEABOVE', (1, 0), (1, 0), 2.5, colors.HexColor("#0284C7")),
            ('LINEABOVE', (2, 0), (2, 0), 2.5, colors.HexColor("#4F46E5")),
            ('LINEABOVE', (3, 0), (3, 0), 2.5, colors.HexColor("#D97706")),
            ('LINEABOVE', (4, 0), (4, 0), 2.5, colors.HexColor("#059669")),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 10))
    else:
        # Standard Inflow/Outflow Financial Register KPI Matrix
        kpi_card_1 = [
            Paragraph("TOTAL SALES (POS)", style_card_title),
            Paragraph(f"<font color='#059669'><b>{currency} {format_inr(tot_sales)}</b></font>", style_card_val),
            Paragraph(f"{len(records_list)} Active Days" + (f" ({tot_invoices} Bills)" if tot_invoices > 0 else ""), style_card_sub)
        ]
        kpi_card_2 = [
            Paragraph("TOTAL INFLOW (EARNED)", style_card_title),
            Paragraph(f"<font color='#059669'><b>{currency} {format_inr(tot_earned)}</b></font>", style_card_val),
            Paragraph(f"Cash: {currency}{format_inr(tot_cash)} | UPI: {currency}{format_inr(tot_upi)}", style_card_sub)
        ]
        kpi_card_3 = [
            Paragraph("TOTAL OUTFLOW (PAID)", style_card_title),
            Paragraph(f"<font color='#DC2626'><b>{currency} {format_inr(tot_paid)}</b></font>", style_card_val),
            Paragraph(f"Vendors: {currency}{format_inr(tot_supp)} | Ops: {currency}{format_inr(tot_paid - tot_supp)}", style_card_sub)
        ]
        kpi_card_4_val_color = "#DC2626" if is_net_neg else "#0284C7"
        kpi_card_4 = [
            Paragraph(kpi_card_4_title, style_card_title),
            Paragraph(f"<font color='{kpi_card_4_val_color}'><b>{format_inr_curr(net_change, currency, show_sign=True)}</b></font>", style_card_val),
            Paragraph("Outflow exceeded Inflow" if is_net_neg else "Inflow minus Outflow", style_card_sub)
        ]
        kpi_card_5_val_color = "#DC2626" if is_closing_neg else "#0284C7"
        kpi_card_5 = [
            Paragraph("FIRM CLOSING BALANCE" + (" (MINUS)" if is_closing_neg else ""), style_card_title),
            Paragraph(f"<font color='{kpi_card_5_val_color}'><b>{format_inr_curr(closing_bal, currency)}</b></font>", style_card_val),
            Paragraph(f"Opening: {format_inr_curr(opening_bal, currency)} &bull; {closing_status}", style_card_sub)
        ]

        kpi_table_data = [[kpi_card_1, kpi_card_2, kpi_card_3, kpi_card_4, kpi_card_5]]
        col_w = 770 / 5.0
        kpi_table = Table(kpi_table_data, colWidths=[col_w] * 5)
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), c_white),
            ('BOX', (0, 0), (-1, -1), 0.75, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border_subtle),
            ('LINEABOVE', (0, 0), (0, 0), 2.5, colors.HexColor("#059669")),
            ('LINEABOVE', (1, 0), (1, 0), 2.5, colors.HexColor("#0D9488")),
            ('LINEABOVE', (2, 0), (2, 0), 2.5, colors.HexColor("#EF4444")),
            ('LINEABOVE', (3, 0), (3, 0), 2.5, colors.HexColor("#DC2626") if is_net_neg else colors.HexColor("#0284C7")),
            ('LINEABOVE', (4, 0), (4, 0), 2.5, colors.HexColor("#DC2626") if is_closing_neg else colors.HexColor("#0284C7")),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 10))

    # 3. Section 1: Daily Inflow, Outflow & Firm Balance Table
    if include_register:
        sec1_title = "1. DAY-BY-DAY FINANCIAL REGISTER" if include_payments else "DAY-BY-DAY FINANCIAL REGISTER"
        story.append(Paragraph(f"{sec1_title} ({len(records_list)} Active Days Recorded)", style_section_heading))

        table_headers = [
            Paragraph("Date", style_th),
            Paragraph(f"Sales / Inflow<br/>({currency})", style_th),
            Paragraph(f"UPI Inflow<br/>({currency})", style_th),
            Paragraph(f"Cash Inflow<br/>({currency})", style_th),
            Paragraph(f"Supplier Paid<br/>({currency})", style_th),
            Paragraph(f"Staff Exp<br/>({currency})", style_th),
            Paragraph(f"Shop Exp<br/>({currency})", style_th),
            Paragraph(f"Vehicle/Fuel<br/>({currency})", style_th),
            Paragraph(f"Total Outflow<br/>({currency})", style_th),
            Paragraph(f"Opening Bal<br/>({currency})", style_th),
            Paragraph(f"Net Change<br/>({currency})", style_th),
            Paragraph(f"Firm Bal<br/>({currency})", style_th),
            Paragraph("Daily Remarks / Summary", style_th)
        ]

        col_widths = [54, 56, 52, 52, 50, 46, 46, 46, 56, 52, 50, 56, 104]
        rows_data = [table_headers]

        for idx, r in enumerate(records_list):
            d_val = r.get('date')
            d_str = d_val.strftime('%d-%m-%Y') if hasattr(d_val, 'strftime') else str(d_val)
            s_val = Decimal(str(r.get('daily_sales') or '0.00'))
            c_val = Decimal(str(r.get('cash_earned') or '0.00'))
            u_val = Decimal(str(r.get('upi_earned') or '0.00'))
            e_val = Decimal(str(r.get('total_earned') or (c_val + u_val)))
            supp_val = Decimal(str(r.get('supplier_payments') or '0.00'))
            stf_val = Decimal(str(r.get('staff_expenses') or '0.00'))
            veh_val = Decimal(str(r.get('vehicle_expenses') or '0.00'))
            exp_val = Decimal(str(r.get('expenses') or '0.00'))
            p_val = Decimal(str(r.get('total_paid') or '0.00'))
            op_val = Decimal(str(r.get('opening_balance') or '0.00'))
            nc_val = Decimal(str(r.get('net_day_change') or (e_val - p_val)))
            cl_val = Decimal(str(r.get('closing_balance') or '0.00'))
            inv_cnt = int(r.get('invoices_count') or 0)

            # Construct short summary note
            notes_txt = (r.get('notes') or '').strip()
            details_list = r.get('payment_details') if isinstance(r.get('payment_details'), list) else []
            if not notes_txt and len(details_list) > 0:
                recips = [it.get('recipient') or it.get('staff_name') or it.get('category') or 'Payout' for it in details_list[:2]]
                notes_txt = f"{len(details_list)} payouts: {', '.join(recips)}"
                if len(details_list) > 2:
                    notes_txt += f" +{len(details_list)-2} more"
            elif not notes_txt and inv_cnt > 0:
                notes_txt = f"{inv_cnt} POS bills recorded"

            if len(notes_txt) > 35:
                notes_txt = notes_txt[:33] + "..."

            # Opening balance styling for negative values
            if op_val < Decimal('0.00'):
                op_cell = Paragraph(f"<font color='#DC2626'><b>-{format_inr(abs(op_val))}</b></font>", style_td_bold_right)
            else:
                op_cell = Paragraph(format_inr(op_val), style_td_right)

            # Net change styling
            if nc_val < Decimal('0.00'):
                nc_cell = Paragraph(f"<font color='#DC2626'><b>-{format_inr(abs(nc_val))}</b></font>", style_td_bold_right)
            elif nc_val > Decimal('0.00'):
                nc_cell = Paragraph(f"<font color='#059669'>+{format_inr(nc_val)}</font>", style_td_bold_right)
            else:
                nc_cell = Paragraph("0.00", style_td_right)

            # Firm balance styling
            if cl_val < Decimal('0.00'):
                cl_cell = Paragraph(f"<font color='#DC2626'><b>-{format_inr(abs(cl_val))}</b></font>", style_td_bold_right)
            else:
                cl_cell = Paragraph(f"<font color='#0284C7'><b>{format_inr(cl_val)}</b></font>", style_td_bold_right)

            row_cells = [
                Paragraph(d_str, style_td_center),
                Paragraph(f"<font color='#15803D'><b>{format_inr(e_val)}</b></font>", style_td_bold_right),
                Paragraph(f"<font color='#4F46E5'>{format_inr(u_val)}</font>", style_td_right),
                Paragraph(f"<font color='#059669'>{format_inr(c_val)}</font>", style_td_right),
                Paragraph(format_inr(supp_val) if supp_val > 0 else "-", style_td_right),
                Paragraph(format_inr(stf_val) if stf_val > 0 else "-", style_td_right),
                Paragraph(format_inr(exp_val) if exp_val > 0 else "-", style_td_right),
                Paragraph(format_inr(veh_val) if veh_val > 0 else "-", style_td_right),
                Paragraph(f"<font color='#DC2626'><b>{format_inr(p_val)}</b></font>", style_td_bold_right),
                op_cell,
                nc_cell,
                cl_cell,
                Paragraph(notes_txt or "-", style_td_left)
            ]
            rows_data.append(row_cells)

        # Total Summary Row
        tot_op_cell = Paragraph(f"<font color='#DC2626'><b>-{format_inr(abs(opening_bal))}</b></font>" if is_opening_neg else format_inr(opening_bal), style_td_total)
        tot_nc_cell = Paragraph(f"<font color='#DC2626'><b>-{format_inr(abs(net_change))}</b></font>" if is_net_neg else (f"+{format_inr(net_change)}" if net_change > Decimal('0.00') else "0.00"), style_td_total)
        tot_cl_cell = Paragraph(f"<font color='#DC2626'><b>-{format_inr(abs(closing_bal))}</b></font>" if is_closing_neg else f"<font color='#0284C7'><b>{format_inr(closing_bal)}</b></font>", style_td_total)

        summary_row = [
            Paragraph("TOTAL / SUMMARY", style_td_total_label),
            Paragraph(f"<font color='#15803D'><b>{format_inr(tot_earned)}</b></font>", style_td_total),
            Paragraph(f"<font color='#4F46E5'><b>{format_inr(tot_upi)}</b></font>", style_td_total),
            Paragraph(f"<font color='#059669'><b>{format_inr(tot_cash)}</b></font>", style_td_total),
            Paragraph(format_inr(tot_supp), style_td_total),
            Paragraph(format_inr(tot_staff), style_td_total),
            Paragraph(format_inr(tot_exp), style_td_total),
            Paragraph(format_inr(tot_veh), style_td_total),
            Paragraph(f"<font color='#DC2626'><b>{format_inr(tot_paid)}</b></font>", style_td_total),
            tot_op_cell,
            tot_nc_cell,
            tot_cl_cell,
            Paragraph(f"{len(records_list)} Active Days", style_td_total_label)
        ]
        rows_data.append(summary_row)

        ledger_table = Table(rows_data, colWidths=col_widths, repeatRows=1)
        
        # Table Styling (System Default Theme)
        table_styles = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ('LINEABOVE', (0, 0), (-1, 0), 1, c_border),
            ('LINEBELOW', (0, 0), (-1, 0), 1.2, colors.HexColor("#94A3B8")),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('INNERGRID', (0, 0), (-1, -1), 0.35, c_border_subtle),
            ('BOX', (0, 0), (-1, -1), 0.75, c_border),
            *[
                ('BACKGROUND', (0, r_idx), (-1, r_idx), c_zebra if r_idx % 2 == 0 else c_white)
                for r_idx in range(1, len(rows_data) - 1)
            ],
            ('BACKGROUND', (0, -1), (-1, -1), c_total_bg),
            ('LINEABOVE', (0, -1), (-1, -1), 1.2, c_emerald),
            ('LINEBELOW', (0, -1), (-1, -1), 1.5, c_emerald),
            ('BACKGROUND', (1, 1), (1, -2), colors.HexColor("#ECFDF5")),
            ('BACKGROUND', (2, 1), (2, -2), colors.HexColor("#EEF2FF")),
            ('BACKGROUND', (3, 1), (3, -2), colors.HexColor("#ECFDF5")),
            ('BACKGROUND', (8, 1), (8, -2), colors.HexColor("#FEF2F2")),
            ('BACKGROUND', (11, 1), (11, -2), colors.HexColor("#F0F9FF")),
            ('BACKGROUND', (1, -1), (1, -1), colors.HexColor("#DCFCE7")),
            ('BACKGROUND', (8, -1), (8, -1), colors.HexColor("#FEE2E2")),
            ('BACKGROUND', (11, -1), (11, -1), colors.HexColor("#E0F2FE")),
        ]
        ledger_table.setStyle(TableStyle(table_styles))
        story.append(ledger_table)
        story.append(Spacer(1, 12))

    # Page break between sections when generating the full combined report
    if include_register and include_payments:
        story.append(PageBreak())

    # 4. Section 2: Summary of Payment History (Itemized Disbursements & Payout Breakdown)
    if include_payments:
        sec2_title = "2. SUMMARY OF PAYMENT HISTORY & EXPENSE DISBURSEMENTS" if include_register else "SUMMARY OF PAYMENT HISTORY & EXPENSE DISBURSEMENTS"
        story.append(Paragraph(f"{sec2_title} ({len(all_payment_items)} Total Entries)", style_section_heading))

        # Breakdown by Category Box
        by_cat = {
            'VENDOR': {'count': 0, 'cash': Decimal('0'), 'upi': Decimal('0'), 'credit': Decimal('0'), 'total': Decimal('0')},
            'STAFF': {'count': 0, 'cash': Decimal('0'), 'upi': Decimal('0'), 'credit': Decimal('0'), 'total': Decimal('0')},
            'VEHICLE': {'count': 0, 'cash': Decimal('0'), 'upi': Decimal('0'), 'credit': Decimal('0'), 'total': Decimal('0')},
            'SHOP': {'count': 0, 'cash': Decimal('0'), 'upi': Decimal('0'), 'credit': Decimal('0'), 'total': Decimal('0')},
            'OTHER': {'count': 0, 'cash': Decimal('0'), 'upi': Decimal('0'), 'credit': Decimal('0'), 'total': Decimal('0')},
        }

        for p_item in all_payment_items:
            itype = p_item['type']
            if itype in ['VENDOR', 'SUPPLIER']:
                cat_key = 'VENDOR'
            elif itype == 'STAFF':
                cat_key = 'STAFF'
            elif itype == 'VEHICLE':
                cat_key = 'VEHICLE'
            elif itype in ['SHOP', 'EXPENSE']:
                cat_key = 'SHOP'
            else:
                cat_key = 'OTHER'

            by_cat[cat_key]['count'] += 1
            amt = p_item['amount']
            by_cat[cat_key]['total'] += amt
            mode = p_item['mode']
            if mode == 'UPI':
                by_cat[cat_key]['upi'] += amt
            elif mode == 'CREDIT':
                by_cat[cat_key]['credit'] += amt
            else:
                by_cat[cat_key]['cash'] += amt

        cat_table_headers = [
            Paragraph("Expense / Payout Category", style_th),
            Paragraph("Vouchers", style_th),
            Paragraph(f"Paid in Cash ({currency})", style_th),
            Paragraph(f"Paid via UPI ({currency})", style_th),
            Paragraph(f"Credit Logged ({currency})", style_th),
            Paragraph(f"Total Category Amount ({currency})", style_th),
            Paragraph("% of Outflow", style_th)
        ]
        cat_rows = [cat_table_headers]

        categories_display = [
            ("Wholesale Supplier & Vendor Bills", by_cat['VENDOR']),
            ("Staff Salaries, Allowances & Tea Expenses", by_cat['STAFF']),
            ("Delivery Vehicle, Fuel & Transportation", by_cat['VEHICLE']),
            ("Shop Maintenance, Rent & Utilities", by_cat['SHOP']),
            ("Miscellaneous Outflows & Drawings", by_cat['OTHER']),
        ]

        for label, stats in categories_display:
            pct = (stats['total'] / tot_paid * 100) if tot_paid > Decimal('0.00') else Decimal('0.00')
            cat_rows.append([
                Paragraph(f"<b>{label}</b>", style_td_left),
                Paragraph(str(stats['count']), style_td_center),
                Paragraph(format_inr(stats['cash']), style_td_right),
                Paragraph(format_inr(stats['upi']), style_td_right),
                Paragraph(format_inr(stats['credit']), style_td_right),
                Paragraph(f"<b>{format_inr(stats['total'])}</b>", style_td_bold_right),
                Paragraph(f"{pct:.1f}%", style_td_center)
            ])

        # Category Total Row
        cat_rows.append([
            Paragraph("TOTAL DISBURSEMENTS", style_td_total_label),
            Paragraph(str(len(all_payment_items)), style_td_total_label),
            Paragraph(format_inr(sum(s['cash'] for s in by_cat.values())), style_td_total),
            Paragraph(format_inr(sum(s['upi'] for s in by_cat.values())), style_td_total),
            Paragraph(format_inr(sum(s['credit'] for s in by_cat.values())), style_td_total),
            Paragraph(format_inr(tot_paid), style_td_total),
            Paragraph("100.0%", style_td_total_label)
        ])

        cat_table = Table(cat_rows, colWidths=[200, 60, 100, 100, 100, 120, 90])
        cat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ('LINEABOVE', (0, 0), (-1, 0), 1, c_border),
            ('LINEBELOW', (0, 0), (-1, 0), 1.2, colors.HexColor("#94A3B8")),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('INNERGRID', (0, 0), (-1, -1), 0.35, c_border_subtle),
            ('BOX', (0, 0), (-1, -1), 0.75, c_border),
            *[
                ('BACKGROUND', (0, r_idx), (-1, r_idx), c_zebra if r_idx % 2 == 0 else c_white)
                for r_idx in range(1, len(cat_rows) - 1)
            ],
            ('BACKGROUND', (0, -1), (-1, -1), c_total_bg),
            ('LINEABOVE', (0, -1), (-1, -1), 1.2, c_emerald),
            ('LINEBELOW', (0, -1), (-1, -1), 1.5, c_emerald),
        ]))
        story.append(cat_table)
        story.append(Spacer(1, 10))

        # Itemized Payment Audit Table (if items exist)
        if len(all_payment_items) > 0:
            story.append(Paragraph("<b>Itemized Payment History Log:</b>", ParagraphStyle('SubSub', fontName='Helvetica-Bold', fontSize=9, textColor=c_navy, spaceBefore=4, spaceAfter=4)))

            pay_headers = [
                Paragraph("Date", style_th),
                Paragraph("Category", style_th),
                Paragraph("Recipient / Staff / Vendor", style_th),
                Paragraph("Staff Code", style_th),
                Paragraph("Bill / Ref Note", style_th),
                Paragraph("Mode", style_th),
                Paragraph(f"Amount ({currency})", style_th)
            ]
            pay_col_widths = [65, 85, 200, 70, 190, 60, 100]
            pay_rows = [pay_headers]

            for p_item in all_payment_items:
                d_val = p_item['date']
                d_str = d_val.strftime('%d-%m-%Y') if hasattr(d_val, 'strftime') else str(d_val)
                mode_badge = p_item['mode']
                recip_str = p_item['recipient']
                if len(recip_str) > 40: recip_str = recip_str[:38] + "..."
                ref_str = p_item['ref']
                if len(ref_str) > 38: ref_str = ref_str[:36] + "..."

                pay_rows.append([
                    Paragraph(d_str, style_td_center),
                    Paragraph(p_item['type'], style_td_center),
                    Paragraph(f"<b>{recip_str}</b>", style_td_left),
                    Paragraph(p_item['charge_code'] or "-", style_td_center),
                    Paragraph(ref_str or "-", style_td_left),
                    Paragraph(f"<b>{mode_badge}</b>", style_td_center),
                    Paragraph(format_inr(p_item['amount']), style_td_bold_right)
                ])

            # Subtotal row
            pay_rows.append([
                Paragraph("TOTAL PAYMENT HISTORY", style_td_total_label),
                Paragraph("", style_td_total_label),
                Paragraph(f"{len(all_payment_items)} Payout Records", style_td_total_label),
                Paragraph("", style_td_total_label),
                Paragraph("", style_td_total_label),
                Paragraph("", style_td_total_label),
                Paragraph(format_inr(sum(it['amount'] for it in all_payment_items)), style_td_total)
            ])

            pay_table = Table(pay_rows, colWidths=pay_col_widths, repeatRows=1)
            pay_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ('LINEABOVE', (0, 0), (-1, 0), 1, c_border),
                ('LINEBELOW', (0, 0), (-1, 0), 1.2, colors.HexColor("#94A3B8")),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 2.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('INNERGRID', (0, 0), (-1, -1), 0.35, c_border_subtle),
                ('BOX', (0, 0), (-1, -1), 0.75, c_border),
                *[
                    ('BACKGROUND', (0, r_idx), (-1, r_idx), c_zebra if r_idx % 2 == 0 else c_white)
                    for r_idx in range(1, len(pay_rows) - 1)
                ],
                ('BACKGROUND', (0, -1), (-1, -1), c_total_bg),
                ('LINEABOVE', (0, -1), (-1, -1), 1.2, c_emerald),
                ('LINEBELOW', (0, -1), (-1, -1), 1.5, c_emerald),
            ]))
            story.append(pay_table)
            story.append(Spacer(1, 12))

    # 5. Official Verification Sign-off Box (2 Signing Authorities)
    sign_off_data = [
        [
            Paragraph("<b>Prepared & Authorized By:</b><br/><br/><br/>________________________________________<br/><b>Cashier / Co-Founder</b>", style_td_center),
            Paragraph("<b>Verified & Approved By:</b><br/><br/><br/>________________________________________<br/><b>Co-Founder</b>", style_td_center)
        ]
    ]
    sign_off_table = Table(sign_off_data, colWidths=[385, 385])
    sign_off_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, c_border),
        ('BACKGROUND', (0, 0), (-1, -1), c_white),
        ('LINEABOVE', (0, 0), (-1, 0), 2, c_brand),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    
    story.append(KeepTogether(sign_off_table))

    # Build document with running header / footer canvas
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
