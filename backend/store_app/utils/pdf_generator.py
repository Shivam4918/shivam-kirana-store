import io
from decimal import Decimal
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

PRIMARY_COLOR = colors.HexColor('#10B981')   # Emerald Green
SECONDARY_COLOR = colors.HexColor('#0F172A') # Slate Dark
TEXT_COLOR = colors.HexColor('#334155')      # Slate Gray Text
LIGHT_BG = colors.HexColor('#F8FAFC')        # Off-white

def get_base_styles():
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=PRIMARY_COLOR,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=TEXT_COLOR,
        spaceAfter=15
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=SECONDARY_COLOR,
        spaceBefore=10,
        spaceAfter=8
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9,
        textColor=TEXT_COLOR
    )

    header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.white
    )
    
    return title_style, subtitle_style, section_style, body_style, header_style

def add_header(story, title, subtitle_text):
    title_style, subtitle_style, _, _, _ = get_base_styles()
    story.append(Paragraph("SHIVAM KIRANA STORE", title_style))
    story.append(Paragraph(f"<b>{title}</b> — Generated on: {timezone.localtime(timezone.now()).strftime('%Y-%m-%d %H:%M:%S')}", subtitle_style))
    if subtitle_text:
        _, _, _, body_style, _ = get_base_styles()
        story.append(Paragraph(subtitle_text, body_style))
        story.append(Spacer(1, 10))

def generate_pdf_response(title, subtitle_text, table_headers, table_data, summary_data=None):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    
    add_header(story, title, subtitle_text)
    
    title_style, subtitle_style, section_style, body_style, header_style = get_base_styles()
    
    # Render Summary Block if exists
    if summary_data:
        story.append(Paragraph("Executive Summary", section_style))
        summary_table_data = []
        for label, val in summary_data.items():
            summary_table_data.append([
                Paragraph(f"<b>{label}:</b>", body_style),
                Paragraph(str(val), body_style)
            ])
        
        summary_table = Table(summary_table_data, colWidths=[200, 340])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 15))
        
    story.append(Paragraph("Detailed Statement", section_style))
    
    # Process main data table
    formatted_data = []
    
    # Headers
    formatted_data.append([Paragraph(h, header_style) for h in table_headers])
    
    # Rows
    for row in table_data:
        formatted_row = []
        for cell in row:
            if isinstance(cell, Paragraph):
                formatted_row.append(cell)
            else:
                formatted_row.append(Paragraph(str(cell), body_style))
        formatted_data.append(formatted_row)
        
    # Table Styling
    col_count = len(table_headers)
    t = Table(formatted_data)
    
    t_style = [
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,1), (-1,-1), 5),
    ]
    
    # Alternate row background colors
    for i in range(1, len(formatted_data)):
        if i % 2 == 0:
            t_style.append(('BACKGROUND', (0,i), (-1,i), LIGHT_BG))
            
    t.setStyle(TableStyle(t_style))
    story.append(t)
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_invoice_pdf(invoice):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    title_style, subtitle_style, section_style, body_style, header_style = get_base_styles()

    # Title Banner
    story.append(Paragraph("SHIVAM KIRANA STORE", title_style))
    story.append(Paragraph("GSTIN: 22AAAAA0000A1Z5 | Smart Grocery & Digital Khata Manager", subtitle_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("TAX INVOICE", section_style))

    # Meta Table (Invoice & Customer details)
    meta_data = [
        [
            Paragraph(f"<b>Invoice No:</b> {invoice.invoice_number}", body_style),
            Paragraph(f"<b>Customer Name:</b> {invoice.customer.user.username}", body_style)
        ],
        [
            Paragraph(f"<b>Date:</b> {invoice.created_at.strftime('%Y-%m-%d %H:%M:%S')}", body_style),
            Paragraph(f"<b>Phone Number:</b> {invoice.customer.user.phone_number or 'N/A'}", body_style)
        ],
        [
            Paragraph("<b>State Code:</b> 22 (Chhattisgarh)", body_style),
            Paragraph(f"<b>Outstanding Debt:</b> ₹{invoice.customer.current_balance}", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # Items Header & Table
    story.append(Paragraph("Billing Particulars", section_style))

    headers = ['S.No', 'Product', 'HSN', 'Qty', 'Rate', 'Taxable', 'CGST%', 'CGST', 'SGST%', 'SGST', 'Total']
    formatted_headers = [Paragraph(f"<font color='white'><b>{h}</b></font>", body_style) for h in headers]

    table_data = [formatted_headers]

    items = invoice.items.all()
    for idx, item in enumerate(items, 1):
        product_name = item.product.name if item.product else "Deleted Product"
        hsn = item.product.hsn_code if item.product and item.product.hsn_code else "N/A"
        gst_rate = item.gst_rate
        half_rate = gst_rate / Decimal('2.00')

        row = [
            Paragraph(str(idx), body_style),
            Paragraph(product_name, body_style),
            Paragraph(hsn, body_style),
            Paragraph(str(item.quantity), body_style),
            Paragraph(f"₹{item.unit_price}", body_style),
            Paragraph(f"₹{item.total_amount - (item.cgst_amount + item.sgst_amount)}", body_style),
            Paragraph(f"{half_rate}%", body_style),
            Paragraph(f"₹{item.cgst_amount}", body_style),
            Paragraph(f"{half_rate}%", body_style),
            Paragraph(f"₹{item.sgst_amount}", body_style),
            Paragraph(f"₹{item.total_amount}", body_style),
        ]
        table_data.append(row)

    col_widths = [25, 120, 40, 25, 50, 55, 35, 45, 35, 45, 65]
    items_table = Table(table_data, colWidths=col_widths)

    t_style = [
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,1), (-1,-1), 5),
    ]

    for i in range(1, len(table_data)):
        if i % 2 == 0:
            t_style.append(('BACKGROUND', (0,i), (-1,i), LIGHT_BG))

    items_table.setStyle(TableStyle(t_style))
    story.append(items_table)
    story.append(Spacer(1, 15))

    # Invoice Summary Totals Table (aligned to the right side of the page)
    summary_data = [
        [Paragraph("", body_style), Paragraph("<b>Taxable Subtotal:</b>", body_style), Paragraph(f"₹{invoice.subtotal}", body_style)],
        [Paragraph("", body_style), Paragraph("<b>CGST Total:</b>", body_style), Paragraph(f"₹{invoice.cgst_total}", body_style)],
        [Paragraph("", body_style), Paragraph("<b>SGST Total:</b>", body_style), Paragraph(f"₹{invoice.sgst_total}", body_style)],
        [Paragraph("", body_style), Paragraph("<b>Grand Total (Incl Tax):</b>", body_style), Paragraph(f"<b>₹{invoice.grand_total}</b>", body_style)],
    ]
    summary_table = Table(summary_data, colWidths=[300, 140, 100])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('PADDING', (1,0), (-1,-1), 4),
        ('LINEABOVE', (1,3), (2,3), 1, SECONDARY_COLOR),
    ]))
    story.append(summary_table)

    story.append(Spacer(1, 30))
    story.append(Paragraph("<font size=8 color='#64748B'>Thank you for shopping with Shivam Kirana Store. This is an electronically generated GST tax invoice charged directly on your secure credit ledger.</font>", body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

