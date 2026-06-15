# Shivam Kirana Store - Retail ERP & Digital Khata Manager
## Comprehensive System Documentation

Welcome to the official system documentation for **Shivam Kirana Store**, a complete Retail ERP, Inventory Control, Advanced Accounting, and Digital Khata (Customer Ledger) management system. 

---

## 🏗️ Technical Architecture & Stack

The application is built on a modern, high-performance web architecture designed for split-second updates and visual excellence:

*   **Frontend (Single Page Application)**:
    *   **React.js (Vite)**: Component-driven fast rendering.
    *   **Tailwind CSS (v4)**: Modern utility styling with glassmorphism effects, harmonized emerald/slate color tokens, and fluid layout cards.
    *   **Framer Motion**: Premium micro-animations (page transitions, checkout drawers, floating cart indicators).
    *   **React Icons (Feather Icons)**: Lightweight, professional vector icons.
*   **Backend (RESTful API Service)**:
    *   **Django & Django REST Framework (DRF)**: High-security Python framework supplying secure JWT auth, database controllers, and analytical endpoints.
    *   **PostgreSQL (Neon Cloud)**: Relational database storing accounts, ledger books, catalog inventory, and supplier logs.
    *   **SQLite (Local Fallback)**: Configured for local development.
*   **Document Generation Engines**:
    *   **ReportLab (PDF)**: Dynamic generator creating formal A4 PDF reports with branding headers, formatted ledger tables, and page-budget numbers.
    *   **openpyxl (Excel)**: Constructs multi-tab Excel sheets with dynamic column auto-widths and numeric formatting.

---

## 🔑 Role-Based Access Control (RBAC)

The application enforces a strict role structure:
1.  **ADMIN (Store Owner - Shivam)**: Has full access to the backend database, business analytics, financial accounting statements, inventory control, expense management, supplier logs, and customer ledger adjustments.
2.  **CUSTOMER (Shopper)**: Has access to the instant storefront catalog, credit shopping cart checkout, and their personal digital ledger statements.

---

## 👤 Admin Functionality (Store Owner Control Panel)

The Admin panel provides a central dashboard for running the wholesale and retail operations.

### 1. Analytics & Executive Dashboard
*   **Performance Metrics**: Real-time calculations of:
    *   **Today's Earnings**: Sum of cash/UPI payments received from customers today.
    *   **Total Outstanding Credit**: Cumulative debt currently owed by customers.
    *   **Customer Directory Count**: Total registered shoppers.
    *   **Product Catalog Count**: Total items registered in inventory.
*   **Visual Trend Charts**:
    *   *Revenue Trends*: Daily cash inflows over the last 7 days.
    *   *Credit Trends*: Owed checkout balances logged over the last 7 days.
    *   *Debt Spread Bracket*: Bar breakdowns showing customer distributions (No Debt, <1k, 1k-5k, 5k+).
*   **Recent Activity Stream**: A chronological feed of the last 10 transactions across all customer ledger profiles.

### 2. Product & Inventory Catalog Management
*   **Catalog CRUD**: Create, read, update, and delete grocery items.
*   **Stock Ledger Adjustments**: Real-time management of stock counts.
*   **Pricing Control**: Set retail selling price alongside wholesale cost price (cost price is used to compute accurate net margins).
*   **Low Stock Alerts**: Automatically highlights products falling below safety thresholds.

### 3. Customer Directory & Khata Ledger
*   **Shopper Accounts CRM**: Register new customers with name, phone, and optional email.
*   **Manual Ledger Adjustment**: Directly log cash payments (debits/settlements) or manual credits.
*   **Unread Notification Badges**: Identifies high-risk customer balances.
*   **Account Locking**: Instantly lock/suspend a customer's credit privileges. Suspended accounts cannot place credit orders, and are greeted with a lock-screen warning.

### 4. Expense Tracking Module
*   **Operating Expense Logs**: Record operational and utility overheads.
*   **Categorized Logging**: Group expenses under **Rent, Electricity, Internet, Staff Salary, Transport, Maintenance, and Miscellaneous**.
*   **Visual Overheads Breakdown**: Renders a dynamic bar chart indicating category spending ratios.
*   **Ledger Filters**: Real-time searching, category selection, and start-to-end date filtering.

### 5. Supplier Registry & Wholesale Purchase Book
*   **Wholesale CRM**: Manage vendor contacts, emails, addresses, and GSTIN registry.
*   **Integrated Purchase Orders**: Log bulk product purchases directly from a supplier:
    *   Automatically increments the selected product's stock count.
    *   Saves cost price metrics.
    *   Updates outstanding trade payables (vendor debts) dynamically.
*   **Payable Ledger Settlements**: Record payments made to wholesale vendors to reduce liability.
*   **Supplier History logs**: Settle accounts by checking specific purchase-by-purchase ledgers.

### 6. Dynamic Financial Accounting Center
Provides instant double-entry summaries:
*   **Profit & Loss Statement**:
    *   *Sales Revenue*: Total credit sales.
    *   *Cost of Goods Sold (COGS)*: Value of sold stock calculated using unit cost prices.
    *   *Gross Profit*: Total sales minus COGS.
    *   *Operating Expenses*: Sum of all logged utility/rent overheads.
    *   *Net Profit*: Actual net profit margin.
*   **Balance Sheet**:
    *   *Liquid Assets*: Cash/bank balances.
    *   *Inventory Valuation*: Cost value of current warehouse stock (Units × Cost Price).
    *   *Accounts Receivable*: Unpaid credit outstanding from customers.
    *   *Accounts Payable*: Debts owed to wholesale suppliers.
    *   *Owner's Equity*: Total Net Worth of the business.
*   **Cash Flow statement**: Tracks cash inflows (payments collected) vs outflows (supplier settlements + operating costs).

### 7. Executive Report Export Engine
*   Generate on-demand statements filtered by date ranges.
*   Format output as:
    *   **A4 PDF Documents**: Formatted with custom grid layouts and store headers.
    *   **Excel Spreadsheets**: Auto-column formatting for easy recordkeeping.

---

## 🛒 Customer Functionality (Shopper Dashboard)

The Customer portal provides a self-service center designed like a modern grocery app.

### 1. grocery Storefront Catalog
*   **Interactive Grid Layout**: View all available grocery items with high-resolution image placecards, categories, stock limits, and descriptions.
*   **Dynamic Searching & Sorting**: Sort products alphabetically, or by price (low-to-high, high-to-low) with instant search filtering.
*   **Category Tags**: Fast tab-based filtering (e.g. Staples, Dairy, Snacks).
*   **Deals & Delivery Promotions**: Dynamic discount calculations and prompts for free delivery thresholds (e.g. Free above ₹200).

### 2. Credit Shopping Cart & Checkout
*   **Smart Quantity Limits**: Restricts additions to cart based on real-time stock levels.
*   **Cart Drawer**: Quick review of item breakdowns, promo savings, and order total.
*   **Instant Credit Checkout**: Places orders directly on credit. It records a new `CREDIT` transaction in the customer's Khata, decreases warehouse stock, and updates the dashboard immediately.

### 3. Personal Digital Khata Ledger
*   **Liability Metrics**: Tracks outstanding balance owed, lifetime grocery purchases, and total cash paid.
*   **Chronological Ledger Book**: Lists transaction entries (Credits vs Payments) indicating:
    *   Date of order or cash settlement.
    *   Detailed item counts (e.g. "Checked out Milk x 4").
    *   Charged amount (+ for debt, - for payments).
    *   Running balance snapshot calculated at that specific timestamp.

### 4. Account Lock Warning Block
*   If the admin suspends a customer's Khata, the storefront is disabled.
*   Displays an explicit red warning card explaining that the account is suspended and prompts them to settle outstanding debts at the counter.

---

## 🔔 Real-time Automated Notifications

To help run the store, the system features an automated alert engine in the navigation header for Admins:
1.  **Low Stock Alert**: Triggered when a product's stock count falls below 10 units.
2.  **High Customer Debt Alert**: Triggered when a customer's ledger balance exceeds ₹5,000.
3.  **Supplier Due Alert**: Triggered when a supplier vendor is owed more than ₹10,000.
