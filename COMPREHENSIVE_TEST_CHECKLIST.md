# 🛒 FRITID E-COMMERCE PLATFORM - COMPREHENSIVE TEST CHECKLIST

## PROJECT OVERVIEW
- **Backend**: Express.js + MySQL Database
- **Frontend**: Angular 20+ Application
- **Key Features**: Product Catalog, Shopping Cart, User Authentication, Orders, Admin Panel, Payments (UPN/Cash), Shipping (GLS), Invoicing (Minimax)

---

## 1. 🏠 HOME PAGE / PRODUCT CATALOG
- [ ] Page loads without errors
- [ ] All products display correctly with images
- [ ] Product cards show: name, description, price, image
- [ ] Product prices display with correct currency formatting
- [ ] **Search functionality** works correctly
- [ ] **Price range filter** works (if implemented)
- [ ] Products have color options displayed (if applicable)
- [ ] "Add to Cart" button is visible and clickable on all products
- [ ] Pagination works (if implemented)

---

## 2. 🔍 PRODUCT DETAIL PAGE
- [ ] Click on product takes you to detail page
- [ ] Product name, description, price display correctly
- [ ] Product image displays properly
- [ ] Color selection dropdown appears (if product has colors)
- [ ] Quantity selector allows +/- or input
- [ ] **"Add to Cart" button** works correctly
- [ ] Stock quantity is displayed
- [ ] Product information is accurate
- [ ] Related products display (if implemented)
- [ ] Back to catalog button/link works

---

## 3. 🛒 SHOPPING CART
- [ ] Cart page accessible via navigation/link
- [ ] **All added items display** with correct quantities
- [ ] Each cart item shows: product name, price, quantity, subtotal
- [ ] Selected colors are remembered and displayed
- [ ] **Quantity can be updated** (increase/decrease)
- [ ] **Remove item** button works correctly
- [ ] **Clear entire cart** functionality works (if available)
- [ ] Cart shows **subtotal** correctly calculated
- [ ] **Shipping cost** (€5.99) displays correctly
- [ ] **VAT (22%)** is calculated and displayed
- [ ] **Total price** is correct (subtotal + shipping + VAT)
- [ ] Empty cart state displays message (if applicable)
- [ ] Cart persists on page refresh (localStorage)
- [ ] Cart updates across different pages/tabs

---

## 4. 🔐 AUTHENTICATION SYSTEM
### Register New User
- [ ] Register page accessible from auth page
- [ ] **Enter email, first name, last name, password**
- [ ] Password validation works (strength requirements, if any)
- [ ] **Email uniqueness check** prevents duplicate accounts
- [ ] **Success: User created and redirected** to dashboard/home
- [ ] **Error messages display** for invalid data
- [ ] Confirmation email sent (check email service)

### Login Existing User
- [ ] Login form accessible
- [ ] **Enter email and password**
- [ ] Correct credentials allow login
- [ ] **JWT token generated** and stored
- [ ] User redirected to appropriate page
- [ ] **Invalid credentials show error** message
- [ ] Non-existent email shows error
- [ ] Wrong password shows error

### Login with Guest Checkout
- [ ] User can proceed to checkout **without** registering
- [ ] Guest checkout form appears on shipping page
- [ ] Guest can enter shipping info without account
- [ ] Order is created for guest user (guest account created)

---

## 5. 📦 CHECKOUT PROCESS
### Shipping Information
- [ ] **Checkout page accessible** from cart
- [ ] If logged in: user data pre-fills form
- [ ] Form shows fields: firstName, lastName, email, address, postalCode, city, phoneNumber
- [ ] **All required fields validated**
- [ ] Address information is saved correctly
- [ ] Different shipping address option (if available)
- [ ] Form submission works without errors
- [ ] **"Continue to Payment" button** takes you to payment page

### Payment Method Selection
- [ ] Payment method selection page displays
- [ ] **Two payment options available:**
  1. **UPN (Bank Transfer)** - For invoice-based payment
  2. **Cash on Delivery** - COD payment option
- [ ] Radio buttons allow selection of payment method
- [ ] **Order summary displays:**
  - [ ] Subtotal (products)
  - [ ] Shipping cost (€5.99)
  - [ ] VAT amount (22%)
  - [ ] Total amount
- [ ] Selected payment method is highlighted
- [ ] **"Confirm & Pay" button** completes the order

---

## 6. 💳 PAYMENT PROCESSING

### UPN Payment Flow
- [ ] Select UPN payment method
- [ ] Click "Confirm & Pay"
- [ ] **Minimax invoice is created** in accounting system
- [ ] Invoice PDF is generated and stored
- [ ] **Order confirmation email sent** with invoice attachment
- [ ] Email contains payment details and UPN code
- [ ] Order status changes to **"Awaiting Payment"**
- [ ] GLS shipping label is generated (if auto-enabled)
- [ ] Shipping label PDF available for download
- [ ] Owner notification email is sent (if enabled)

### Cash on Delivery Payment Flow
- [ ] Select Cash on Delivery method
- [ ] Click "Confirm & Pay"
- [ ] **Order created successfully**
- [ ] **Order confirmation email sent** (without invoice)
- [ ] Order status changes to **"Pending"** or **"Confirmed"**
- [ ] GLS shipping label is generated
- [ ] Shipping label PDF available
- [ ] Owner notification email sent

---

## 7. 📧 EMAIL NOTIFICATIONS
- [ ] **Order Confirmation Email** is sent after checkout
  - [ ] Contains order ID and date
  - [ ] Lists all ordered products with quantities
  - [ ] Shows shipping address
  - [ ] Shows payment method
  - [ ] Shows total amount
  - [ ] Contains order summary table
  - [ ] UPN payments include invoice attachment
  - [ ] Contains customer service contact info
  
- [ ] **Owner/Admin Notification Email** sent
  - [ ] Informs store owner of new order
  - [ ] Contains order details
  - [ ] Shows customer contact info
  - [ ] Links to admin panel

---

## 8. 📋 ORDER CONFIRMATION PAGE
- [ ] After payment, **Thank You page** displays
- [ ] Thank you message is displayed
- [ ] **Order ID is shown**
- [ ] Order summary displays all products
- [ ] Shipping address is confirmed
- [ ] Total amount is shown
- [ ] **Download GLS shipping label** link/button available (if shipping enabled)
- [ ] "Continue Shopping" button returns to catalog
- [ ] Confirmation page is accessible via URL with order ID
- [ ] Order is saved in database correctly

---

## 9. 🚚 SHIPPING INTEGRATION (GLS)
- [ ] **GLS shipping label is generated** for orders
- [ ] Shipping label contains:
  - [ ] Parcel number
  - [ ] Sender address (FRITID company)
  - [ ] Recipient address (from order)
  - [ ] Content description
  - [ ] Reference number (order ID)
  - [ ] QR code / barcode
  - [ ] Pickup date information
  
- [ ] **COD Amount** included if applicable (for cash orders)
- [ ] Shipping label is **downloadable as PDF**
- [ ] PDF formatting is correct (A4 4x1 format for printing)
- [ ] Label is stored for future access
- [ ] Multiple parcels handled correctly (if applicable)
- [ ] Label generation error handling works

---

## 10. 💰 INVOICING SYSTEM (Minimax Integration)
- [ ] **Invoice created** in Minimax system after UPN payment
- [ ] Invoice contains:
  - [ ] Invoice number/ID
  - [ ] Invoice date
  - [ ] Due date (14 days default)
  - [ ] Customer information
  - [ ] Item details (name, quantity, price, VAT)
  - [ ] Subtotal
  - [ ] VAT amount (22%)
  - [ ] Shipping cost line item
  - [ ] Total amount
  - [ ] Payment terms
  
- [ ] **PDF invoice generated** and stored
- [ ] Invoice attached to order confirmation email
- [ ] Invoice accessible from order history
- [ ] Invoice number correctly linked to order
- [ ] Minimax API authentication works
- [ ] VAT calculations are correct

---

## 11. 👤 USER ACCOUNT MANAGEMENT
- [ ] **User Profile page** accessible
- [ ] User can view their information:
  - [ ] First name, Last name
  - [ ] Email address
  - [ ] Phone number
  - [ ] Address
  - [ ] City, Postal code
  
- [ ] **Edit profile** functionality works
- [ ] All profile fields can be updated
- [ ] Changes are saved to database
- [ ] Confirmation message displays
- [ ] Email cannot be changed (or properly validated if it can)
- [ ] Profile data persists on refresh
- [ ] Password change functionality (if available)

---

## 12. 📜 ORDER HISTORY
- [ ] **My Orders page** accessible for logged-in users
- [ ] All user's orders display in list/table
- [ ] Each order shows:
  - [ ] Order ID/number
  - [ ] Order date
  - [ ] Order status
  - [ ] Total amount
  - [ ] Number of items
  
- [ ] **Click on order** opens order details page
- [ ] Order details show:
  - [ ] Full order information
  - [ ] All products in order
  - [ ] Quantities and prices
  - [ ] Shipping address
  - [ ] Payment method
  - [ ] Order status
  - [ ] Shipping label download link (if available)
  - [ ] Invoice download link (for UPN orders)
  
- [ ] Guest users can NOT access other users' orders
- [ ] Pagination works if many orders
- [ ] Order statuses correctly displayed (Pending, Confirmed, Shipped, Delivered, etc.)

---

## 13. 👨‍💼 ADMIN PANEL ACCESS
- [ ] **Admin panel accessible** only with admin privileges
- [ ] Unauthorized users **redirected** from admin routes
- [ ] Admin guard protects `/admin/products` route
- [ ] Non-admin users cannot access admin functions

---

## 14. 🛠️ ADMIN - PRODUCT MANAGEMENT
- [ ] **Admin can access** Product Management page
- [ ] **All products display** with all details
- [ ] **Create new product:**
  - [ ] Form appears with fields: name, description, price, image URL
  - [ ] Colors field accepts multiple colors (JSON array)
  - [ ] Category field works
  - [ ] Stock quantity field works
  - [ ] Image upload functionality works
  - [ ] Validation prevents empty required fields
  - [ ] Product created successfully
  - [ ] New product appears in catalog immediately
  
- [ ] **Edit existing product:**
  - [ ] Admin can select product to edit
  - [ ] Form pre-fills with current data
  - [ ] All fields can be modified
  - [ ] Changes saved to database
  - [ ] Changes visible in catalog immediately
  
- [ ] **Delete product:**
  - [ ] Admin can delete products
  - [ ] Confirmation prompt appears (if implemented)
  - [ ] Deleted product removed from catalog
  - [ ] Deleted product removed from database
  - [ ] Error handling for deletion issues
  
- [ ] **Product status management:**
  - [ ] Admin can activate/deactivate products
  - [ ] Inactive products don't show in customer catalog
  - [ ] Status changes are immediate

---

## 15. 🖼️ IMAGE UPLOAD FUNCTIONALITY
- [ ] **Image upload works** in product management
- [ ] Only image files accepted (JPG, PNG, etc.)
- [ ] File size limit enforced (5MB)
- [ ] Error message for invalid file types
- [ ] Error message for oversized files
- [ ] Uploaded image path stored in database
- [ ] Images display correctly in product cards
- [ ] Images display correctly in product detail page
- [ ] Multiple images can be uploaded for different products
- [ ] Image URL is correct and accessible

---

## 16. 🔍 SEARCH & FILTERING
- [ ] **Search products** by name/description
- [ ] Search results display correctly
- [ ] Search is case-insensitive
- [ ] Special characters handled correctly
- [ ] **Price range filter** works:
  - [ ] Set minimum price
  - [ ] Set maximum price
  - [ ] Filter applies correctly
  - [ ] Results update in real-time
  
- [ ] **Category filtering** (if implemented)
- [ ] **Color filtering** (if implemented)
- [ ] Multiple filters can be combined
- [ ] Clear filters button resets search
- [ ] No results message displays when appropriate

---

## 17. 🔒 SECURITY & VALIDATION
- [ ] **JWT tokens** properly validated on protected routes
- [ ] **Admin middleware** prevents unauthorized access
- [ ] **Password hashing** works correctly (bcrypt)
- [ ] Sensitive data not exposed in responses
- [ ] CORS properly configured
- [ ] Input validation on all forms
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection enabled
- [ ] Email validation works
- [ ] Password strength requirements enforced
- [ ] Rate limiting (if implemented)

---

## 18. 💻 DATABASE & DATA INTEGRITY
- [ ] **Database initializes** on first run
- [ ] All tables created correctly: users, products, orders, order_items
- [ ] Sample/seed data loads properly
- [ ] Data persists correctly to database
- [ ] Foreign key relationships work
- [ ] Order items linked correctly to orders
- [ ] Orders linked correctly to users
- [ ] Calculations (totals, VAT) stored correctly
- [ ] No data loss on cart update
- [ ] Guest users stored correctly without password

---

## 19. 🎨 UI/UX TESTING
- [ ] Website is **responsive** on mobile devices
- [ ] Website is **responsive** on tablets
- [ ] Website is **responsive** on desktop
- [ ] Navigation menu works on all screen sizes
- [ ] Buttons are clickable and properly sized
- [ ] Forms are user-friendly
- [ ] Error messages are clear and helpful
- [ ] Success messages are clear
- [ ] Loading indicators appear for async operations
- [ ] Cart icon shows item count
- [ ] Logout functionality visible when logged in
- [ ] Login/Register links visible when logged out
- [ ] Color scheme is consistent
- [ ] Typography is readable
- [ ] Spacing and padding looks professional

---

## 20. ⚠️ ERROR HANDLING & EDGE CASES
- [ ] **Network errors** display friendly message
- [ ] **Server errors (500)** handled gracefully
- [ ] **Invalid routes (404)** redirect to home
- [ ] **Empty cart checkout** shows appropriate message
- [ ] **Out of stock items** handled (if stock tracking enabled)
- [ ] **Duplicate order prevention** works
- [ ] **Session timeout** handled gracefully
- [ ] **Multiple concurrent orders** from same user work
- [ ] **Invalid product IDs** return error
- [ ] **Zero price/negative price** validation
- [ ] **Missing required fields** on forms prevent submission
- [ ] **Old/expired tokens** handled correctly

---

## 21. 📱 BROWSER COMPATIBILITY
- [ ] Works in **Chrome/Chromium**
- [ ] Works in **Firefox**
- [ ] Works in **Safari**
- [ ] Works in **Edge**
- [ ] Works in **Mobile Safari** (iOS)
- [ ] Works in **Chrome Mobile** (Android)

---

## 22. ⚡ PERFORMANCE & LOADING
- [ ] Homepage loads within reasonable time (< 3 seconds)
- [ ] Product images load quickly
- [ ] Search results load quickly
- [ ] No console errors
- [ ] No console warnings
- [ ] Network requests are reasonable in number
- [ ] API responses are fast
- [ ] No memory leaks (long sessions)
- [ ] Pagination/lazy loading works if implemented

---

## 23. 🔄 INTEGRATION TESTING
- [ ] **Complete flow**: Browse → Add to Cart → Checkout → Payment → Confirmation
- [ ] **UPN Flow**: Product → Cart → Checkout → UPN Payment → Invoice → Shipping Label
- [ ] **Cash Flow**: Product → Cart → Checkout → Cash Payment → Shipping Label
- [ ] **Guest Flow**: Browse → Add to Cart → Guest Checkout → Order Confirmation
- [ ] **Registered Flow**: Login → Browse → Add to Cart → Checkout → Order
- [ ] **Multiple products** can be added to single order
- [ ] **Multiple colors** of same product can be added separately
- [ ] **Order appears in history** after completion
- [ ] **Admin can see all orders**

---

## 24. 📧 EMAIL VERIFICATION
- [ ] Check **spam/junk** folder for emails
- [ ] Emails contain correct **from address**
- [ ] Emails are **formatted properly** (HTML templates work)
- [ ] Email **attachments** load correctly (invoices)
- [ ] Email links are **clickable** and correct
- [ ] Email contains all **required information**

---

## 25. 🗂️ FILE SYSTEM & STORAGE
- [ ] **Product images** stored in correct directory (`/uploads/images/products/`)
- [ ] **Invoices** stored in correct directory (`/uploads/invoices/`)
- [ ] Files have **unique names** (no overwrites)
- [ ] **File permissions** correct for server access
- [ ] Old files don't interfere with new ones
- [ ] Files are **accessible** via correct URLs

---

## QUICK TEST FLOW FOR BOSS DEMO

### 5-Minute Quick Test:
1. [ ] **Homepage** - Browse products, verify images & prices
2. [ ] **Product Detail** - Click product, check details
3. [ ] **Add to Cart** - Add product, verify cart updates
4. [ ] **Checkout** - Fill shipping info
5. [ ] **Payment** - Select payment method
6. [ ] **Order Confirmation** - Verify order created & email sent
7. [ ] **Admin Panel** - Create/edit a product
8. [ ] **Search** - Test search functionality

### 15-Minute Comprehensive Test:
- Complete guest checkout flow
- Complete registered user flow
- Test admin product management
- Verify email notifications
- Check order history
- Test product search and filters
- Verify responsive design on mobile

---

## NOTES FOR BOSS PRESENTATION:
- ✅ Test all user flows (guest, registered, admin)
- ✅ Verify payments work (both UPN and Cash)
- ✅ Check email notifications are sent
- ✅ Confirm shipping labels generate
- ✅ Test responsive design
- ✅ Verify no console errors
- ✅ Check database integrity
- ✅ Ensure all images load
- ✅ Verify calculations are correct (VAT, totals)
- ✅ Test on multiple browsers/devices

---

**Last Updated:** January 5, 2026
