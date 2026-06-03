from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUTPUT = "docs/google-ads-api-design-documentation.docx"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_borders(cell, color="DADCE0"):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "4")
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def add_heading(doc, text, level=1):
    paragraph = doc.add_heading(text, level=level)
    return paragraph


def add_bullet(doc, text):
    paragraph = doc.add_paragraph(style="List Bullet")
    paragraph.add_run(text)
    return paragraph


def add_number(doc, text):
    paragraph = doc.add_paragraph(style="List Number")
    paragraph.add_run(text)
    return paragraph


def add_kv_table(doc, rows):
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.allow_autofit = False
    table.columns[0].width = Inches(2.1)
    table.columns[1].width = Inches(4.25)
    header = table.rows[0]
    header.cells[0].text = "Area"
    header.cells[1].text = "Details"
    set_repeat_table_header(header)
    for cell in header.cells:
      set_cell_shading(cell, "F2F4F7")
      set_cell_borders(cell)
      for p in cell.paragraphs:
          for run in p.runs:
              run.bold = True

    for key, value in rows:
        cells = table.add_row().cells
        cells[0].text = key
        cells[1].text = value
        for cell in cells:
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
            set_cell_borders(cell)
    doc.add_paragraph()
    return table


def build():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.1

    for style_name, size, color in [
        ("Title", 24, "0B2545"),
        ("Heading 1", 16, "2E74B5"),
        ("Heading 2", 13, "2E74B5"),
        ("Heading 3", 12, "1F4D78"),
    ]:
        style = styles[style_name]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string(color)

    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.LEFT
    title.add_run("Nexus AI - Google Ads API Design Documentation")

    subtitle = doc.add_paragraph()
    subtitle.add_run("Purpose: Developer token access review for a first-party reporting and campaign analytics tool.").italic = True

    add_heading(doc, "1. Company and Business Model", 1)
    doc.add_paragraph(
        "Nexus AI is an internal agency operations tool used by Prymeira Digital to manage paid-media reporting for client advertising accounts. "
        "The company provides digital marketing and performance reporting services to business clients. The tool is not an ad network, data broker, lead reseller, or public self-serve advertising platform."
    )
    doc.add_paragraph(
        "Google Ads data is used to help authorized agency staff review campaign performance, generate client-ready reports, and export summaries for account management workflows."
    )

    add_heading(doc, "2. Users and Access", 1)
    add_kv_table(doc, [
        ("Primary users", "Internal employees and authorized contractors of the agency who manage reporting for client ad accounts."),
        ("External access", "Clients may receive generated reports or exported PDFs/messages, but they do not directly operate the Google Ads API integration in the current implementation."),
        ("Authentication", "Users sign in through Supabase Auth. API calls to Edge Functions require an authenticated session, except OAuth callback endpoints."),
        ("Authorization", "Google Ads access is granted by the Google account owner through OAuth consent. Tokens are stored server-side and are not exposed to the browser."),
    ])

    add_heading(doc, "3. Google Ads API Usage", 1)
    add_bullet(doc, "List accessible Google Ads customer accounts after the user completes OAuth.")
    add_bullet(doc, "Read customer and campaign metadata, including account ID, campaign ID, name, status, currency, and timezone.")
    add_bullet(doc, "Read reporting metrics such as cost, impressions, clicks, CTR, CPC, CPM, conversions, conversion value, and ROAS.")
    add_bullet(doc, "Generate dashboards, charts, report previews, PDF exports, and WhatsApp-ready summaries for agency reporting workflows.")
    add_bullet(doc, "The application does not create, mutate, pause, delete, or optimize campaigns through the API at this stage.")

    add_heading(doc, "4. Architecture Overview", 1)
    add_kv_table(doc, [
        ("Frontend", "React/Vite application running the Nexus AI dashboard and report preview views."),
        ("Backend", "Supabase Edge Functions for Google OAuth, account sync, campaign sync, and insights retrieval."),
        ("Database", "Supabase Postgres tables store users, connections, ad platform accounts, campaigns, and insight snapshots."),
        ("OAuth", "The app redirects users to Google OAuth with the Google Ads scope. The callback stores encrypted/secured tokens server-side through Supabase."),
        ("Google Ads calls", "Edge Functions call Google Ads API endpoints from the server, using the configured developer token and OAuth access token."),
    ])

    add_heading(doc, "5. Data Flow", 1)
    add_number(doc, "An authenticated agency user clicks Connect Google in Nexus AI.")
    add_number(doc, "The app requests a Google OAuth URL from the Supabase Edge Function.")
    add_number(doc, "The user grants Google Ads access through Google's OAuth consent screen.")
    add_number(doc, "The OAuth callback stores the refresh token and access token in Supabase for that user connection.")
    add_number(doc, "The dashboard requests accounts and metrics through authenticated Edge Functions.")
    add_number(doc, "The Edge Functions call Google Ads API and return normalized reporting data to the frontend.")
    add_number(doc, "Reports are rendered in the dashboard and can be exported for client communication.")

    add_heading(doc, "6. Security and Data Handling", 1)
    add_bullet(doc, "OAuth refresh tokens and access tokens are stored only in Supabase and are accessed by server-side Edge Functions.")
    add_bullet(doc, "The browser never receives Google refresh tokens, developer tokens, client secrets, or service role keys.")
    add_bullet(doc, "Supabase Row Level Security policies restrict user access to their own records.")
    add_bullet(doc, "The integration uses read-oriented reporting scopes and does not sell, share, or transfer Google Ads data to unrelated third parties.")
    add_bullet(doc, "Data is used only for account reporting, analytics review, and client communication by the authorized agency team.")

    add_heading(doc, "7. Screens and User Workflow", 1)
    doc.add_paragraph(
        "The primary screens are: login/register, agency dashboard, account portfolio, Google connection action, report preview, campaign charts, settings, and PDF export. "
        "The user workflow is intentionally simple: authenticate, connect Google Ads, select an account, choose a reporting period, review metrics, and export/send a report."
    )

    add_heading(doc, "8. Compliance Notes", 1)
    add_bullet(doc, "The tool is first-party/custom software for the agency's own reporting workflow.")
    add_bullet(doc, "The current implementation is not intended for App Conversion Tracking and Remarketing API use.")
    add_bullet(doc, "The current implementation is not a third-party platform embedded into another product.")
    add_bullet(doc, "The current Google Ads API use case is reporting/analytics, not campaign mutation or automated bidding.")

    add_heading(doc, "9. Contact and Ownership", 1)
    add_kv_table(doc, [
        ("Product", "Nexus AI"),
        ("Organization", "Prymeira Digital"),
        ("Use case", "Internal agency reporting and analytics for authorized Google Ads accounts."),
        ("Review request", "Basic access to read Google Ads reporting data for real client accounts with user-granted OAuth consent."),
    ])

    doc.save(OUTPUT)


if __name__ == "__main__":
    build()
