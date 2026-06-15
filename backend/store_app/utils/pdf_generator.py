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
