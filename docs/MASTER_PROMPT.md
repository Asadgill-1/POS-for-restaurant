# MASTER PROMPT: BUILD A PROFESSIONAL RESTAURANT POS SYSTEM FOR DUBAI

## ROLE

You are a senior SaaS product architect, restaurant POS specialist, UI/UX designer, database architect, security engineer, and full-stack software engineer.

I want you to design and build a **modern, production-ready Restaurant Point of Sale (POS) system specifically designed for restaurants operating in Dubai, UAE**.

Do not create a simple demo, toy application, or generic CRUD dashboard.

Think like you are building a commercial POS product that restaurants will use every day for:

- Taking dine-in orders
- Takeaway orders
- Delivery orders
- Table management
- Kitchen operations
- Cashier operations
- Payments
- VAT invoices
- Staff management
- Inventory
- Discounts
- Customer management
- Sales reporting
- End-of-day closing
- Multi-branch management

The system should be scalable enough to support a single restaurant as well as restaurant groups with multiple branches.

---

# 1. PRODUCT OBJECTIVE

Build a complete restaurant POS platform called:

**[YOUR POS BRAND NAME]**

Target market:

- Restaurants in Dubai
- Cafes
- Fast-food restaurants
- Cloud kitchens
- Fine dining restaurants
- Food courts
- Bakeries
- Small restaurant chains
- Multi-branch restaurant groups

Currency:

**AED (UAE Dirham)**

Primary language:

**English**

Architecture should allow future support for:

- Arabic
- English
- Additional languages

The interface must be:

- Fast
- Clean
- Modern
- Professional
- Touch-friendly
- Easy to learn
- Optimized for restaurant staff
- Optimized for tablets and POS terminals
- Responsive on desktop

---

# 2. IMPORTANT DEVELOPMENT RULE

Do not jump directly into writing code.

First think through the complete product architecture.

Before implementing anything, define:

1. Product architecture
2. User roles
3. Database schema
4. Business logic
5. POS workflow
6. Order lifecycle
7. Payment lifecycle
8. Kitchen workflow
9. Inventory workflow
10. Reporting architecture
11. Security architecture
12. API architecture
13. Frontend architecture
14. Error handling
15. Offline strategy
16. Testing strategy

Then implement the system module by module.

Do not create fake functionality.

If something is not implemented, clearly mark it as TODO rather than pretending it works.

---

# 3. RECOMMENDED TECHNOLOGY STACK

Use a modern production-ready architecture.

Preferred stack:

Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Query / TanStack Query
- Zustand where appropriate

Backend:
- Node.js
- TypeScript
- Next.js API routes OR a clean backend API architecture

Database:
- PostgreSQL

ORM:
- Prisma

Authentication:
- Secure session-based authentication or JWT where appropriate

Validation:
- Zod

Charts:
- Recharts

Icons:
- Lucide React

Deployment-ready architecture:
- Docker
- Environment variables
- Production database configuration
- Logging
- Error monitoring hooks

If you believe another technology is substantially better, explain why before changing the stack.

---

# 4. MULTI-TENANT SAAS ARCHITECTURE

The system should be designed as a SaaS application.

Structure:

Organization
    ↓
Branches
    ↓
POS Terminals
    ↓
Employees
    ↓
Orders
    ↓
Payments

Each restaurant organization must have isolated data.

Example:

Restaurant Group A
├── Dubai Marina Branch
├── Downtown Branch
└── Jumeirah Branch

Restaurant Group B
├── Business Bay Branch
└── Deira Branch

Users from Restaurant Group A must never access Restaurant Group B data.

Every important database entity should have appropriate organization/branch ownership.

---

# 5. USER ROLES

Implement role-based access control.

Roles:

## Super Admin

Can:

- Manage organizations
- Manage subscriptions
- Manage all branches
- Manage system settings
- View system-wide analytics

## Restaurant Owner

Can:

- View all branches
- View reports
- Manage menus
- Manage employees
- Manage inventory
- Manage settings
- View financial summaries

## Branch Manager

Can:

- Manage branch
- Manage staff
- Manage menu
- Manage tables
- View branch reports
- Approve discounts
- Perform end-of-day closing

## Cashier

Can:

- Create orders
- Take payments
- Print receipts
- Apply permitted discounts
- Manage cash drawer

Cannot:

- Change system settings
- Modify historical transactions
- Access sensitive financial settings

## Waiter

Can:

- Create orders
- Assign tables
- Add items
- Send orders to kitchen
- View their own orders

Cannot:

- Access financial reports
- Delete completed orders
- Change prices unless authorized

## Kitchen Staff

Can:

- View kitchen orders
- Update order status
- Mark items as preparing
- Mark items as ready

Cannot:

- Access financial reports
- Process payments

## Inventory Manager

Can:

- Manage stock
- Purchase stock
- Stock adjustments
- Suppliers
- Inventory reports

---

# 6. AUTHENTICATION

Implement:

- Login
- Logout
- Password hashing
- Session management
- Role-based authorization
- Forgot password
- Reset password
- Account lockout/rate limiting
- Audit logging

Optional future support:

- PIN login for POS employees
- Biometric authentication
- Two-factor authentication

For POS terminals, support quick employee switching using secure PINs.

---

# 7. MAIN POS SCREEN

The POS screen is the most important screen.

Design it for speed.

Suggested layout:

--------------------------------------------------
TOP BAR
Branch | Terminal | Employee | Time | Shift
--------------------------------------------------

LEFT / CENTER:
Categories

[Pizza] [Burgers] [Drinks] [Desserts]

Product grid:

[Product] [Product] [Product]
[Product] [Product] [Product]
[Product] [Product] [Product]

RIGHT:
Current Order

Table:
T12

Customer:
Walk-in

Items:

Chicken Burger     32 AED
Fries               12 AED
Coke                 8 AED

Subtotal             52 AED
VAT                  2.48 AED
Discount             0 AED
TOTAL                54.48 AED

[Hold]
[Save]
[Send to Kitchen]
[Pay]

The POS must require minimal clicks.

---

# 8. ORDER TYPES

Support:

1. Dine-In
2. Takeaway
3. Delivery
4. Pickup
5. Drive-through (future-ready)

When creating an order, ask/select:

Order type

For dine-in:

- Table
- Number of guests
- Waiter

For takeaway:

- Customer optional
- Pickup time optional

For delivery:

- Customer
- Phone
- Address
- Delivery fee
- Delivery partner/order reference

---

# 9. TABLE MANAGEMENT

Create a visual restaurant floor plan.

Example:

┌───────┐
│ T01   │
│ 2 pax │
└───────┘

Available tables should look different from:

- Occupied
- Reserved
- Cleaning
- Waiting for payment

Table states:

AVAILABLE
OCCUPIED
RESERVED
BILL_REQUESTED
PAYMENT_PENDING
CLEANING

Allow:

- Assign table
- Move table
- Merge tables
- Split tables
- Transfer table
- Add guests
- View current order
- Close table

Example:

Table 12
4 guests
Order #10425
Total: AED 245.50
Status: Eating

---

# 10. MENU MANAGEMENT

Menu structure:

Menu
→ Category
→ Product
→ Variants
→ Modifiers

Example:

Burgers
    Chicken Burger
        Regular
        Large

Modifiers:

Extra Cheese + AED 5
Extra Patty + AED 12
No Onion
No Pickles
Extra Sauce + AED 2

Support:

- Product name
- Arabic name
- Description
- SKU
- Barcode
- Price
- Cost
- VAT category
- Category
- Image
- Availability
- Modifier groups
- Variants

---

# 11. MODIFIERS

Modifier groups should support:

Required modifiers

Optional modifiers

Single selection

Multiple selection

Example:

Pizza Size:

Small
Medium
Large

Toppings:

Cheese
Olives
Mushroom
Chicken

Pricing must calculate correctly.

Example:

Pizza base = AED 35

Large = +AED 10

Chicken = +AED 8

Extra cheese = +AED 5

Final item price:

AED 58

---

# 12. ORDER MANAGEMENT

Every order must have a unique order number.

Example:

ORD-20260826-000125

Order fields:

- ID
- Order number
- Organization
- Branch
- Terminal
- Employee
- Customer
- Table
- Order type
- Status
- Subtotal
- Discount
- Tax
- Service charge
- Delivery fee
- Total
- Payment status
- Created time
- Updated time

Order statuses:

DRAFT
OPEN
SENT_TO_KITCHEN
PREPARING
READY
SERVED
COMPLETED
CANCELLED
REFUNDED

Never permanently delete completed financial transactions.

Use cancellation/void records.

---

# 13. KITCHEN DISPLAY SYSTEM

Create a Kitchen Display System (KDS).

Kitchen screen should show cards:

----------------------------------
ORDER #10234
TABLE T12

Chicken Burger x2
- No Onion
- Extra Cheese

Fries x2

Coke x2

[ACCEPT]
[PREPARING]
[READY]
----------------------------------

Kitchen statuses:

NEW
ACCEPTED
PREPARING
READY
SERVED

Use timestamps.

Track:

- Order received time
- Preparation start
- Ready time
- Preparation duration

Show overdue orders clearly.

Example:

Target preparation:
15 minutes

Actual:
23 minutes

Mark as delayed.

---

# 14. KITCHEN STATIONS

Allow products to be assigned to kitchen stations.

Examples:

Kitchen
├── Grill
├── Fryer
├── Pizza
├── Bar
└── Dessert

When an order is placed:

Burger → Grill

Fries → Fryer

Coke → Bar

Pizza → Pizza Station

Each station should receive only relevant items.

---

# 15. PAYMENT SYSTEM

Support:

- Cash
- Card
- Digital payment
- Split payment
- Multiple payment methods

Example:

Order total:

AED 200

Customer pays:

Cash = AED 100
Card = AED 100

Order becomes PAID only when:

sum(payments) >= total

Do not mark orders as paid based on a single payment button.

---

# 16. CASH PAYMENT LOGIC

For cash payments:

Order total:

AED 73.50

Customer gives:

AED 100

Change:

AED 26.50

Show:

Amount Due
Amount Received
Change

Use decimal-safe money calculations.

Do not use floating-point arithmetic directly for financial calculations.

Store monetary values safely.

---

# 17. SPLIT BILL

Support:

- Split equally
- Split by item
- Split by custom amount
- Split by percentage

Example:

Total = AED 300

Customer A = AED 150
Customer B = AED 100
Customer C = AED 50

All payments must reconcile exactly to the order total.

Prevent overpayment unless the payment method legitimately requires change.

---

# 18. DISCOUNTS

Support:

- Percentage discount
- Fixed amount discount
- Item-level discount
- Order-level discount
- Coupon
- Promotional pricing

Example:

Subtotal = AED 200

10% discount = AED 20

Tax calculation must follow the configured tax rules.

Do not allow discounts to create negative totals.

Discount permissions should be role based.

Example:

Waiter:
Maximum 5%

Manager:
Maximum 20%

Owner:
Unlimited/configurable

---

# 19. SERVICE CHARGE

Support configurable service charge.

Example:

Subtotal:
AED 200

Service charge:
10%

Service charge:
AED 20

Make service charge configuration branch-specific.

Do not hard-code it.

---

# 20. UAE VAT

The system must be designed to support UAE VAT requirements.

Default VAT configuration:

VAT rate:
5%

But VAT must be configurable because not every product or transaction may use the same tax treatment.

Store:

- Tax rate
- Tax category
- Tax amount
- Tax-inclusive/exclusive configuration

Support VAT-inclusive menu pricing.

Example:

Menu price:
AED 105

If price includes 5% VAT:

Net:
AED 100

VAT:
AED 5

Total:
AED 105

Do not simply add 5% again to VAT-inclusive prices.

The system should allow restaurant administrators to configure tax behavior according to their accounting requirements.

Important:

Do not claim the system is legally compliant without professional UAE tax/accounting validation.

---

# 21. RECEIPTS

Generate professional receipts.

Receipt should contain:

Restaurant logo

Restaurant name

Branch address

TRN

Phone

Order number

Date/time

Cashier

Table/order type

Items

Quantity

Price

Discount

Subtotal

VAT

Service charge

Delivery fee

Total

Payment method

Amount received

Change

Footer message

Example:

--------------------------------
ABC RESTAURANT
Dubai, UAE

TRN: XXXXXXXX

Order: ORD-000123
Date: 26 Aug 2026
Cashier: Ahmed

Chicken Burger   2 x 35.00
Fries             1 x 12.00
Coke              2 x 8.00

Subtotal              98.00
VAT                    4.90
TOTAL                 102.90

Paid by Card

Thank you!
--------------------------------

Support:

- Print receipt
- Reprint receipt
- Email receipt
- Digital receipt

---

# 22. CUSTOMER MANAGEMENT

Customer profile:

- Name
- Phone
- Email
- Address
- Notes
- Order history
- Total spending
- Number of visits
- Last order

Customer types:

- Walk-in
- Registered
- VIP

Do not require customer registration for normal walk-in transactions.

---

# 23. CUSTOMER DISPLAY

Create optional customer-facing display.

Show:

Restaurant name

Current order

Items

Subtotal

VAT

Discount

Total

Payment status

Thank-you message

Avoid exposing internal information.

---

# 24. INVENTORY

Inventory should be recipe-based.

Example:

Chicken Burger requires:

Burger Bun = 1
Chicken Patty = 1
Cheese = 1
Sauce = 20g
Lettuce = 15g

When one burger is sold:

automatically reduce inventory according to the recipe.

Inventory units:

- kg
- g
- litre
- ml
- piece
- box
- pack

Support unit conversion.

Example:

1 kg = 1000 g

---

# 25. STOCK MANAGEMENT

Support:

- Stock receiving
- Stock adjustment
- Stock transfer
- Waste
- Spoilage
- Purchase orders
- Suppliers
- Low-stock alerts
- Stock count
- Inventory valuation

Inventory transaction types:

PURCHASE
SALE
WASTE
ADJUSTMENT
TRANSFER_IN
TRANSFER_OUT
RETURN

Every inventory change should have an audit trail.

---

# 26. SUPPLIERS

Supplier fields:

- Name
- Contact person
- Phone
- Email
- Address
- TRN
- Payment terms

Purchase order:

PO number
Supplier
Branch
Items
Quantity
Cost
Tax
Total
Status

Statuses:

DRAFT
ORDERED
PARTIALLY_RECEIVED
RECEIVED
CANCELLED

---

# 27. STAFF MANAGEMENT

Employee profile:

- Name
- Employee ID
- Phone
- Email
- Role
- Branch
- Status
- PIN
- Hire date

Track:

- Orders created
- Sales
- Discounts
- Voids
- Refunds
- Cash handling

Do not store plain-text passwords or PINs.

---

# 28. SHIFT MANAGEMENT

Implement cashier shifts.

Opening:

Cashier starts shift.

Opening cash:

AED 500

During shift:

Cash sales
Card sales
Refunds
Cash drops

Closing:

Expected cash:

AED 2,350

Actual cash:

AED 2,300

Difference:

-AED 50

Require a reason for significant discrepancies.

Shift statuses:

OPEN
CLOSED

Do not allow two active shifts on the same terminal unless explicitly configured.

---

# 29. CASH DRAWER

Track:

Opening float

Cash sales

Cash refunds

Cash in

Cash out

Cash drops

Expected cash

Actual cash

Variance

Every cash movement should create an immutable transaction record.

---

# 30. REFUNDS

Support:

Full refund

Partial refund

Item refund

Refund to original payment method where possible.

Every refund requires:

- Reason
- User
- Date/time
- Amount
- Original order
- Payment reference

Refund permissions must be role-based.

Never modify the original order total to hide a refund.

---

# 31. VOID / CANCEL LOGIC

Before payment:

Order can be cancelled.

After payment:

Do not simply delete the order.

Create appropriate void/refund records.

Require:

- Reason
- Employee
- Manager authorization where configured

Maintain audit trail.

---

# 32. REPORTING DASHBOARD

Dashboard should show:

Today's sales

Orders

Average order value

VAT collected

Discounts

Refunds

Cash sales

Card sales

Delivery sales

Dine-in sales

Takeaway sales

Top products

Low-selling products

Busy hours

Employee performance

---

# 33. SALES REPORT

Filters:

Today
Yesterday
This week
This month
Custom date range

Show:

Gross sales

Discounts

Net sales

Tax

Service charges

Delivery fees

Refunds

Final sales

Payment breakdown

---

# 34. PRODUCT REPORT

Show:

Product

Quantity sold

Revenue

Discount

Net revenue

Food cost

Gross profit

Margin

Sort by:

Revenue

Quantity

Profit

Margin

---

# 35. EMPLOYEE REPORT

Show:

Employee

Orders

Sales

Average order

Discounts

Refunds

Voids

Cash handled

---

# 36. HOURLY SALES REPORT

Display sales by hour.

Example:

10 AM — AED 300
11 AM — AED 650
12 PM — AED 1,200
1 PM — AED 2,300
2 PM — AED 1,800

Use charts.

---

# 37. PAYMENT REPORT

Show:

Cash
Card
Digital
Other

For each:

Transaction count

Total

Refunds

Net

---

# 38. VAT REPORT

Provide tax summary:

Gross sales

Taxable sales

VAT

Exempt/non-taxable sales where configured

Refund VAT

Net VAT

This report should be exportable.

Do not present it as official tax advice.

---

# 39. EXPORT

Allow export to:

CSV

Excel

PDF

Reports should support:

- Date filters
- Branch filters
- Employee filters
- Payment filters

---

# 40. DASHBOARD UI

Create a professional dashboard.

Sidebar:

Dashboard
POS
Orders
Tables
Kitchen
Menu
Inventory
Customers
Staff
Reports
Settings

Top:

Branch selector
Date
Notifications
User profile

Dashboard cards:

Today's Sales
AED 24,850

Orders
328

Average Order
AED 75.76

VAT
AED 1,183

Charts:

Sales trend
Order type distribution
Payment methods
Top products

---

# 41. DESIGN SYSTEM

Design should feel like a modern commercial SaaS product.

Do NOT make it look like a generic admin template.

Design principles:

- Clean
- Minimal
- High contrast
- Large touch targets
- Clear hierarchy
- Fast interaction
- Consistent spacing
- Professional typography

Use:

8px spacing system

Rounded cards

Subtle borders

Moderate shadows

Clear buttons

Large numeric totals

Avoid:

- Excessive gradients
- Excessive animations
- Tiny text
- Crowded screens
- Unnecessary popups

---

# 42. POS COLOR LOGIC

Use semantic status colors.

Green:
Paid / Ready / Available

Orange:
Pending / Preparing

Red:
Cancelled / Error / Overdue

Blue:
Information / Active

Gray:
Inactive

Do not rely only on color.

Use icons/text as well for accessibility.

---

# 43. RESPONSIVE DESIGN

Support:

Desktop

Tablet

POS terminal

Minimum practical POS touch target:

approximately 44px or larger.

The main POS interface should remain usable on a tablet.

---

# 44. SEARCH

POS search must be extremely fast.

Search products by:

Name

SKU

Barcode

Arabic name

Category

Keyboard input

Barcode scanner input

Search should update quickly without unnecessary page reloads.

---

# 45. BARCODE SCANNER

Treat barcode scanners as keyboard input devices.

When a barcode is scanned:

1. Detect barcode
2. Search product
3. Add product to order
4. Increase quantity if already present

Support barcode assignment in product management.

---

# 46. REAL-TIME SYSTEM

Use real-time updates where appropriate.

Examples:

POS → Kitchen

Kitchen → POS

Table status

Order status

Payment status

Use WebSockets/SSE or another suitable real-time architecture.

Do not overuse real-time technology where normal API calls are sufficient.

---

# 47. OFFLINE-FIRST POS

Restaurant POS must be resilient if internet connectivity temporarily fails.

Design an offline strategy.

During internet outage:

Allow:

- Existing menu
- New orders
- Cash payments
- Local receipt generation
- Kitchen communication where local network permits

When internet returns:

Synchronize transactions.

Critical requirement:

Avoid duplicate orders.

Use:

- Unique transaction IDs
- Idempotency keys
- Sync status
- Conflict handling

Clearly distinguish:

SYNCED
PENDING_SYNC
SYNC_FAILED

---

# 48. AUDIT LOG

Create an immutable audit log.

Track:

- Login
- Logout
- Order creation
- Order modification
- Order cancellation
- Discount
- Refund
- Void
- Payment
- Cash drawer action
- Inventory adjustment
- Price change
- User permission change

Audit record:

User
Action
Entity
Entity ID
Old value
New value
Timestamp
IP/device where appropriate

---

# 49. SECURITY

Follow strong security practices.

Requirements:

- Password hashing
- Secure cookies
- CSRF protection where applicable
- Input validation
- SQL injection prevention
- XSS prevention
- Authorization checks on backend
- Rate limiting
- Secure environment variables
- No secrets in frontend
- No sensitive information in logs
- Tenant isolation

Never rely only on frontend permission checks.

Every protected operation must be authorized server-side.

---

# 50. DATABASE DESIGN

Create a normalized PostgreSQL schema.

Core tables/entities should include approximately:

organizations

branches

users

roles

permissions

user_roles

terminals

shifts

tables

table_sections

menu_categories

products

product_variants

modifier_groups

modifiers

product_modifiers

recipes

recipe_items

inventory_items

inventory_transactions

suppliers

purchase_orders

purchase_order_items

customers

orders

order_items

order_item_modifiers

payments

refunds

discounts

tax_rates

cash_transactions

kitchen_orders

kitchen_items

employees

audit_logs

settings

notifications

subscriptions

etc.

Use proper foreign keys.

Use indexes for:

organization_id

branch_id

order_number

created_at

status

customer_id

product_id

payment status

Avoid unnecessary database complexity.

---

# 51. DATABASE MONEY RULE

Never rely on JavaScript floating point numbers for financial calculations.

Use:

Decimal / NUMERIC database fields

and safe decimal arithmetic.

For example:

AED 10.10

must never become:

AED 10.099999999

All totals must reconcile.

---

# 52. ORDER CALCULATION ENGINE

Create one central order calculation service.

Do NOT calculate totals independently in multiple frontend components.

Calculation should follow a consistent pipeline:

1. Item base price
2. Variant adjustment
3. Modifier adjustments
4. Quantity
5. Item discounts
6. Subtotal
7. Order discount
8. Service charge
9. Tax calculation
10. Delivery fee
11. Final total

Return:

subtotal

discount

serviceCharge

taxableAmount

tax

deliveryFee

grandTotal

Do not duplicate this logic throughout the application.

---

# 53. ROUNDING

Define a consistent rounding strategy.

Example:

Money should be rounded to 2 decimal places for AED display.

Ensure:

sum(order items)
+
charges
-
discounts
+
tax
=
final total

with a deterministic rounding policy.

Add automated tests for rounding edge cases.

---

# 54. ORDER NUMBERING

Create human-readable order numbers.

Example:

DUB-MAR-20260826-00125

But also create an internal UUID.

Never use the visible order number as the primary database ID.

---

# 55. SETTINGS

Restaurant settings:

Restaurant name

Logo

TRN

Address

Phone

Email

Currency

VAT settings

Receipt settings

Printer settings

Kitchen settings

Service charge

Discount settings

Order settings

Table settings

Branch settings

User permissions

---

# 56. MULTI-BRANCH

Restaurant owner can switch branches.

Example:

[All Branches ▼]

Dubai Marina

Downtown Dubai

Jumeirah

Reports should support:

All branches

One branch

Multiple branches

Branch comparison.

Example:

Marina:
AED 85,000

Downtown:
AED 110,000

Jumeirah:
AED 72,000

---

# 57. NOTIFICATIONS

Show notifications for:

Low stock

Large discount

Refund

Cash variance

Kitchen delay

Failed payment

Sync failure

New order

System error

---

# 58. ERROR HANDLING

Never show raw errors such as:

"PrismaClientKnownRequestError..."

Instead display user-friendly messages.

Example:

"Unable to complete payment. Please try again."

Log the technical error securely for developers.

---

# 59. LOADING STATES

Every asynchronous operation should have a proper loading state.

Examples:

Saving order...

Processing payment...

Sending to kitchen...

Loading reports...

Do not allow duplicate button clicks during critical transactions.

---

# 60. EMPTY STATES

Every list should have a useful empty state.

Example:

"No orders found for this date."

Buttons where appropriate:

Create Order

Add Product

Add Customer

---

# 61. CONFIRMATION DIALOGS

Require confirmation for dangerous actions:

Delete product

Cancel order

Refund payment

Void transaction

Change price

Close shift

Adjust inventory

Example:

"Are you sure you want to refund AED 245.00?

This action will be recorded in the audit log."

---

# 62. PRINTER ARCHITECTURE

Design printer abstraction.

Possible printers:

Receipt printer

Kitchen printer

Bar printer

Future support:

Network printer

USB printer

Cloud printing

Do not hard-code the UI directly to one printer model.

---

# 63. KITCHEN PRINTING

Kitchen ticket should contain:

Order number

Table

Order type

Time

Items

Modifiers

Special notes

Example:

================================
KITCHEN ORDER #10234

TABLE: T12
TYPE: DINE-IN
TIME: 20:32

2x CHICKEN BURGER
   - NO ONION
   - EXTRA CHEESE

1x FRIES
   - EXTRA CRISPY

================================

---

# 64. ORDER NOTES

Support:

Order-level notes

Item-level notes

Examples:

"No spicy"

"Customer allergic to..."

"Extra sauce"

Important:

Do not automatically interpret free-text notes as structured allergen information.

---

# 65. MENU AVAILABILITY

Allow products to be marked:

Available

Unavailable

Out of stock

Temporarily unavailable

When a product becomes unavailable:

POS should immediately prevent new orders for that product.

If offline, sync availability when connectivity returns.

---

# 66. HAPPY PATH

A typical dine-in transaction:

1. Cashier/waiter logs in
2. Selects Dine-In
3. Selects table T12
4. Adds products
5. Adds modifiers
6. Adds notes
7. Sends order to kitchen
8. Kitchen accepts
9. Kitchen prepares
10. Kitchen marks ready
11. Waiter serves
12. Customer requests bill
13. Cashier opens bill
14. Customer pays
15. Payment is recorded
16. Receipt is generated
17. Table becomes available
18. Inventory is deducted
19. Sales reports update
20. Audit log records transaction

Implement this flow cleanly.

---

# 67. DELIVERY FLOW

Example:

1. Select Delivery
2. Search/create customer
3. Add address
4. Add items
5. Apply delivery fee
6. Send kitchen order
7. Payment
8. Assign delivery partner
9. Mark ready
10. Out for delivery
11. Delivered
12. Complete order

Statuses:

NEW
CONFIRMED
PREPARING
READY
OUT_FOR_DELIVERY
DELIVERED
COMPLETED
CANCELLED

---

# 68. TAKEAWAY FLOW

1. Select Takeaway
2. Add products
3. Add customer optional
4. Send kitchen
5. Payment
6. Prepare
7. Ready
8. Customer pickup
9. Complete

---

# 69. UX PRINCIPLE

The cashier should not need to think about the database.

The UI should guide the user through the operation.

Every screen should answer:

"What should I do next?"

Avoid unnecessary fields.

Use defaults.

Use keyboard shortcuts where useful.

Example:

F2 = Search

F4 = Payment

F8 = Hold Order

ESC = Close modal

---

# 70. PERFORMANCE

POS actions should feel instant.

Optimize:

- Database queries
- API requests
- Product loading
- Search
- Order updates
- Kitchen updates

Avoid unnecessary re-renders.

Use pagination for large datasets.

Use caching where appropriate.

---

# 71. API DESIGN

Create clean APIs.

Example:

POST /api/orders

GET /api/orders/:id

PATCH /api/orders/:id

POST /api/orders/:id/send-kitchen

POST /api/orders/:id/payments

POST /api/orders/:id/refund

GET /api/reports/sales

POST /api/inventory/adjustment

GET /api/products

POST /api/products

Use consistent:

Success responses

Error responses

Validation errors

Authentication errors

Authorization errors

---

# 72. IDEMPOTENCY

Critical financial APIs must support idempotency.

Especially:

Payment

Refund

Order creation

Inventory deduction

Sync

If the same request is submitted twice due to network retry, the system must not create duplicate financial transactions.

---

# 73. TESTING

Create tests for:

Authentication

Authorization

Order creation

Order calculation

VAT

Discounts

Service charges

Split payments

Cash change

Refunds

Inventory deduction

Stock adjustments

Shift closing

Multi-tenant isolation

Offline synchronization

Idempotency

Rounding

Permissions

---

# 74. CRITICAL TEST CASES

Test:

Product:
AED 100

VAT:
5%

Expected:
Subtotal = 100
VAT = 5
Total = 105

Also test VAT-inclusive pricing:

Total = 105

Expected:

Net = 100
VAT = 5

Test discount:

100 - 10% = 90

VAT calculation according to configured tax policy.

Test split payment:

Total = 100

Cash = 40

Card = 60

Paid = true.

Test overpayment:

Total = 100

Cash = 150

Change = 50

Test duplicate payment request.

The second request must not create another payment.

---

# 75. SEED DATA

Create realistic seed data for development.

Organization:

Dubai Food Group

Branches:

Dubai Marina

Downtown Dubai

Jumeirah

Categories:

Burgers

Pizza

Starters

Main Course

Desserts

Drinks

Products:

Chicken Burger

Beef Burger

Margherita Pizza

Pepperoni Pizza

French Fries

Caesar Salad

Cola

Water

Chocolate Cake

Create sample:

Users

Tables

Customers

Orders

Inventory

Suppliers

Reports

---

# 76. DEMO ACCOUNT

Create development/demo accounts:

Owner

Manager

Cashier

Waiter

Kitchen

Use obvious development credentials only.

Never hard-code production passwords.

---

# 77. UI PAGES

Create at minimum:

/login

/dashboard

/pos

/orders

/orders/[id]

/tables

/kitchen

/menu

/menu/products

/menu/categories

/inventory

/inventory/stock

/inventory/purchases

/customers

/staff

/shifts

/reports

/reports/sales

/reports/products

/reports/payments

/reports/vat

/settings

---

# 78. ADMIN DASHBOARD

Include:

Sidebar

Top navigation

Branch switcher

Notifications

Profile menu

Main dashboard

Responsive layout.

Use reusable components.

Do not duplicate UI code unnecessarily.

---

# 79. COMPONENT ARCHITECTURE

Create reusable components such as:

Button

Modal

Drawer

DataTable

SearchInput

ProductCard

CategoryTabs

OrderPanel

OrderItem

PaymentModal

SplitPaymentModal

TableCard

KitchenOrderCard

StatusBadge

CurrencyDisplay

DateRangePicker

ReportCard

ConfirmDialog

LoadingState

EmptyState

ErrorState

---

# 80. ACCESSIBILITY

Support:

Keyboard navigation

Visible focus states

ARIA labels

Readable contrast

Large touch targets

Do not communicate status only through color.

---

# 81. INTERNATIONALIZATION

Although English is the first language, structure the application for future Arabic support.

Prepare for:

RTL

Arabic product names

Arabic receipts

Arabic UI

Dual-language receipts

Do not hard-code text throughout components.

Use translation keys.

---

# 82. TIMEZONE

The system should support restaurant-local timezone configuration.

For Dubai, default timezone:

Asia/Dubai

Store timestamps consistently and display them according to branch timezone.

---

# 83. DATE AND TIME

Use proper date handling.

Avoid manually manipulating dates with string operations.

Reports must respect the branch timezone.

"Today's sales" must mean today's sales in the branch's local timezone.

---

# 84. DATA RETENTION

Do not permanently delete financial records from normal UI actions.

Use:

soft delete

void

refund

archival

where appropriate.

---

# 85. AUDITABILITY

A completed financial transaction should always be traceable.

Given an order, an administrator should be able to answer:

Who created it?

Who modified it?

Who discounted it?

Who sent it to kitchen?

Who accepted payment?

Was it refunded?

Who refunded it?

When?

What changed?

---

# 86. PRODUCT QUALITY

Do not optimize only for visual appearance.

Prioritize:

1. Correct financial calculations
2. Data integrity
3. Security
4. Reliability
5. Speed
6. UX
7. Visual design

A beautiful POS with incorrect totals is unacceptable.

---

# 87. DEVELOPMENT PROCESS

Build in phases.

PHASE 1:
Project foundation

PHASE 2:
Authentication and roles

PHASE 3:
Restaurant/branch architecture

PHASE 4:
Menu

PHASE 5:
POS

PHASE 6:
Orders

PHASE 7:
Kitchen

PHASE 8:
Payments

PHASE 9:
Tables

PHASE 10:
Inventory

PHASE 11:
Customers

PHASE 12:
Staff/shifts

PHASE 13:
Reports

PHASE 14:
Settings

PHASE 15:
Audit/security

PHASE 16:
Offline synchronization

PHASE 17:
Testing

PHASE 18:
Production hardening

Do not try to implement everything in one giant file.

---

# 88. CODE QUALITY

Requirements:

- TypeScript strict mode
- No unnecessary `any`
- Reusable functions
- Reusable components
- Clear naming
- Proper error handling
- Server-side authorization
- Validation
- No duplicated business logic
- No hard-coded restaurant configuration
- No hard-coded VAT assumptions inside business logic
- No secrets committed to source code

---

# 89. IMPORTANT BUSINESS LOGIC RULE

Create a central domain/service layer for:

Order calculation

Payment calculation

Tax calculation

Discount calculation

Inventory deduction

Refund processing

Shift calculation

Do not put critical business logic directly inside React components.

---

# 90. UX DETAILS

When clicking "Pay":

Open payment modal.

Show:

Amount due

Payment method

Amount received

Change

Confirm payment

After successful payment:

Show:

Payment successful

Receipt options:

Print

Email

Done

Do not automatically close important transaction screens before the user can see the result.

---

# 91. PREVENT DOUBLE SUBMISSION

When processing:

Payment

Refund

Order submission

Inventory adjustment

Disable the relevant button while processing.

Use backend idempotency as well.

Frontend prevention alone is not sufficient.

---

# 92. TRANSACTION INTEGRITY

When completing an order/payment:

Use database transactions where necessary.

For example:

Payment creation

Order payment status update

Cash transaction creation

Inventory transaction

Audit record

must remain consistent.

If a critical step fails, rollback appropriately.

---

# 93. REPORT CONSISTENCY

Reports must derive from the same underlying transaction data.

Do not create separate fake sales totals for the dashboard.

Dashboard sales should reconcile with the sales report.

Payment totals should reconcile with payments.

Inventory movements should reconcile with sales and purchases.

---

# 94. SECURITY TESTING

Attempt to verify:

User from Branch A cannot access Branch B.

Waiter cannot refund if not authorized.

Kitchen user cannot access financial reports.

Cashier cannot modify historical completed orders.

Unauthorized API requests fail even if frontend routes are manually accessed.

---

# 95. FINAL UI QUALITY CHECK

Before considering the application complete, check every screen for:

Alignment

Spacing

Typography

Responsive behavior

Loading states

Error states

Empty states

Mobile/tablet usability

Keyboard usability

Accessibility

Consistency

---

# 96. FINAL SYSTEM CHECK

Before declaring the project finished, verify:

[ ] Authentication works

[ ] Roles work

[ ] Tenant isolation works

[ ] Branch isolation works

[ ] POS works

[ ] Dine-in works

[ ] Takeaway works

[ ] Delivery works

[ ] Tables work

[ ] Kitchen works

[ ] Payments work

[ ] Cash change works

[ ] Split payments work

[ ] Discounts work

[ ] VAT calculation works

[ ] Receipts work

[ ] Refunds work

[ ] Voids work

[ ] Shifts work

[ ] Cash drawer works

[ ] Inventory works

[ ] Recipes work

[ ] Stock deduction works

[ ] Customers work

[ ] Staff works

[ ] Reports work

[ ] Audit log works

[ ] Offline strategy is implemented/tested

[ ] Idempotency works

[ ] Error handling works

[ ] Database transactions are correct

[ ] Security checks work

[ ] Responsive design works

[ ] No critical TypeScript errors

[ ] No critical console errors

[ ] Production build succeeds

---

# 97. HOW YOU SHOULD WORK WITH ME

Do not overwhelm me with thousands of lines of code at once.

Work incrementally.

At the beginning:

1. Explain the architecture.
2. Show the folder structure.
3. Show the database schema.
4. Explain major business logic.
5. Explain the development phases.

Then start Phase 1.

For every phase:

1. Explain what you are building.
2. Create the required files.
3. Provide complete code.
4. Explain where each file belongs.
5. Explain how to run/test it.
6. List what is completed.
7. List what remains.
8. Identify any assumptions.

When modifying existing code:

- Do not silently overwrite working functionality.
- Show exactly what needs to change.
- Preserve existing business logic.
- Check dependencies before changing architecture.

---

# 98. IMPORTANT: DO NOT FAKE INTEGRATIONS

If a real payment gateway, printer, tax integration, delivery API, accounting integration, or external service is not connected:

DO NOT pretend it is working.

Instead:

- Build a clean integration interface.
- Create a mock implementation for development.
- Clearly mark the production integration point.

---

# 99. FUTURE INTEGRATIONS

Design the architecture so it can later integrate with:

Payment gateways

Card terminals

Receipt printers

Kitchen printers

Delivery platforms

Accounting systems

CRM

Loyalty systems

WhatsApp notifications

Email

SMS

Online ordering

QR ordering

Self-service kiosks

---

# 100. FUTURE FEATURES

Keep the architecture extensible for:

QR table ordering

Customer loyalty

Membership

Gift cards

Promotions

Reservations

Online ordering

Delivery management

Kitchen display

Self-service kiosk

AI sales analytics

AI demand forecasting

AI inventory prediction

AI menu recommendations

Restaurant performance benchmarking

---

# 101. AI FEATURES

Eventually, the platform may include AI.

Possible features:

"Why were sales lower today?"

"Which products should we promote?"

"Which ingredients are likely to run out?"

"What were our busiest hours?"

"Compare this month with last month."

"Which branch is performing best?"

"Which menu items have low margins?"

AI must use actual restaurant data.

Do not fabricate analytics.

AI responses should clearly distinguish:

Actual data

Calculated metrics

Predictions

Recommendations

---

# 102. CLAUDE IMPLEMENTATION RULE

You are not merely generating UI code.

You are designing a complete restaurant transaction system.

Always ask:

"What happens to the data after the user clicks this button?"

For every action, consider:

Frontend

API

Validation

Authorization

Database

Transaction

Audit log

Real-time update

Error handling

Reporting impact

Offline impact

---

# 103. FINAL EXPECTATION

The final application should feel like a real commercial POS product, not a school project.

It should be:

Fast

Reliable

Secure

Scalable

Professional

Touch-friendly

Dubai/UAE-ready

Multi-branch capable

Financially consistent

Easy for restaurant staff to use.

Start by giving me:

1. Complete system architecture
2. Recommended folder structure
3. PostgreSQL/Prisma database schema design
4. Entity relationship explanation
5. User-role permission matrix
6. POS order lifecycle
7. Payment lifecycle
8. Kitchen lifecycle
9. Inventory lifecycle
10. API architecture
11. UI screen map
12. Development roadmap

Do NOT start generating the entire application immediately.

First provide the architecture and identify any important decisions that need to be made.

After that, begin implementation phase-by-phase.