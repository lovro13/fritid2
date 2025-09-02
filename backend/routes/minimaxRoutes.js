const express = require('express');
const { getToken, apiRequestToMinimax } = require('../minimax/client');
const { getPool } = require('../database/db');
const logger = require('../logger');
const router = express.Router();

function bearerFrom(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

// POST /api/minimax/token
router.post('/token', async (req, res) => {
  logger.info("/token calles")
  try {
    const username = process.env.MINIMAX_USERNAME;
    const password = process.env.MINIMAX_PASSWORD;
    console.log("username, password", username, password)
    const token = await getToken({ username, password });
    res.json(token);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: err.message, details: err?.response?.data || null });
  }
});

// POST /api/minimax/orgs/:orgId/issuedinvoices - Create invoice for order
router.post('/orgs/:orgId/issuedinvoices', async (req, res) => {
  try {
    let token = bearerFrom(req);
    const orgId = req.params.orgId || process.env.MINIMAX_ORG_ID;
    
    // Get token if not provided
    if (!token && process.env.MINIMAX_USERNAME && process.env.MINIMAX_PASSWORD) {
      const t = await getToken({ 
        username: process.env.MINIMAX_USERNAME, 
        password: process.env.MINIMAX_PASSWORD 
      });
      token = t.access_token;
    }
    
    if (!token) return res.status(401).json({ error: 'Missing Bearer token' });

    // Debug logging
    logger.info('Request body:', req.body);
    logger.info('Request headers:', req.headers);

    // Get order data from database
    const orderId = req.body?.orderId;
    if (!orderId) {
      return res.status(400).json({ 
        error: 'orderId is required in request body',
        receivedBody: req.body,
        bodyType: typeof req.body
      });
    }

    const db = getPool();
    
    // Get order with items
    const [orders] = await db.execute(`
      SELECT o.*, u.first_name, u.last_name, u.email 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      WHERE o.id = ?
    `, [orderId]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Get order items
    const [orderItems] = await db.execute(`
      SELECT oi.*, p.name as product_name, p.description 
      FROM order_items oi 
      LEFT JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `, [orderId]);

    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'Order has no items' });
    }

    // Get current date
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Calculate due date (14 days from now as per env)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(process.env.MINIMAX_DUE_DAYS || 14));
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Build invoice rows from order items
    const invoiceRows = orderItems.map((item, index) => {
      const priceWithoutVat = parseFloat(item.price);
      const vatPercent = parseFloat(process.env.MINIMAX_VAT_PERCENT || 22);
      const priceWithVat = priceWithoutVat * (1 + vatPercent / 100);
      const totalValue = priceWithoutVat * item.quantity;

      return {
        Item: { ID: process.env.MINIMAX_ITEM_ID }, // Use configured item ID
        ItemName: item.product_name || `Product ${item.product_id}`,
        RowNumber: index + 1,
        ItemCode: `ITEM_${item.product_id}`,
        Description: item.description || item.product_name || `Product ${item.product_id}`,
        Quantity: item.quantity,
        UnitOfMeasurement: process.env.MINIMAX_UOM || "kos",
        Price: priceWithoutVat,
        PriceWithVAT: priceWithVat,
        VATPercent: vatPercent,
        Discount: 0,
        DiscountPercent: 0,
        Value: totalValue,
        VatRate: { ID: process.env.MINIMAX_VAT_RATE_ID || 1 }
      };
    });

    // Create invoice payload based on C# sample
    const invoicePayload = {
      Customer: { ID: process.env.MINIMAX_CUSTOMER_ID },
      DateIssued: date,
      DateTransaction: date,
      DateTransactionFrom: date,
      DateDue: dueDateStr,
      AddresseeName: `${order.shipping_first_name} ${order.shipping_last_name}`,
      AddresseeAddress: order.shipping_address,
      AddresseePostalCode: order.shipping_postal_code,
      AddresseeCity: order.shipping_city,
      AddresseeCountryName: "Slovenia",
      AddresseeCountry: { ID: 191 }, // Slovenia country ID
      Currency: { ID: process.env.MINIMAX_CURRENCY_ID || 7 }, // EUR
      PaymentMethod: { ID: process.env.MINIMAX_PAYMENT_METHOD_ID },
      Status: "O", // Open status
      PricesOnInvoice: process.env.MINIMAX_PRICES_ON_INVOICE || "N",
      RecurringInvoice: "N",
      InvoiceType: "R", // Regular invoice
      PaymentStatus: process.env.MINIMAX_ALREADY_PAID === "Y" ? "Placan" : "NePlačan",
      IssuedInvoiceRows: invoiceRows
    };

    logger.info('Creating Minimax invoice with payload');

    // Create invoice via Minimax API
    const invoiceResponse = await apiRequestToMinimax({
      method: 'POST',
      path: `orgs/${orgId}/issuedinvoices`,
      token,
      body: invoicePayload
    });

    logger.info('Invoice created successfully:', invoiceResponse);

    // Optionally issue and generate PDF if configured
    if (process.env.MINIMAX_AUTO_ISSUE_PDF === 'true') {
      try {
        const issuedInvoiceId = invoiceResponse.IssuedInvoiceId;
        const rowVersion = invoiceResponse.RowVersion;
        
        if (issuedInvoiceId && rowVersion) {
          const pdfResponse = await apiRequestToMinimax({
            method: 'PUT',
            path: `orgs/${orgId}/issuedinvoices/${issuedInvoiceId}/actions/IssueAndGeneratePdf`,
            token,
            body: {},
            query: { rowVersion }
          });

          logger.info('Invoice PDF generated:', pdfResponse.Data?.AttachmentFileName);
          
          return res.status(201).json({
            success: true,
            invoice: invoiceResponse,
            pdf: pdfResponse.Data
          });
        } else {
          logger.warn('Missing IssuedInvoiceId or RowVersion for PDF generation');
        }
      } catch (pdfError) {
        logger.error('Failed to generate PDF:', pdfError);
        // Return invoice without PDF - don't fail the whole operation
      }
    }

    res.status(201).json({
      success: true,
      invoice: invoiceResponse
    });

  } catch (err) {
    logger.error('Invoice creation failed:', err);
    const status = err?.response?.status || 500;
    res.status(status).json({ 
      error: err.message, 
      details: err?.response?.data || null 
    });
  }
});

// GET /api/minimax/orgs (current user orgs)
router.get('/orgs', async (req, res) => {
  try {
    let token = bearerFrom(req);
    // Optionally obtain a token using env creds if none provided
    if (!token && process.env.MINIMAX_USERNAME && process.env.MINIMAX_PASSWORD) {
      const t = await getToken({ username: process.env.MINIMAX_USERNAME, password: process.env.MINIMAX_PASSWORD });
      token = t.access_token;
    }
    if (!token) return res.status(401).json({ error: 'Missing Bearer token' });
    const data = await apiRequestToMinimax({ method: 'GET', path: 'currentuser/orgs', token, query: req.query });
    res.json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: err.message, details: err?.response?.data || null });
  }
});

// Generic passthrough for GET under /orgs/:orgId/*
router.get('/orgs/:orgId/*', async (req, res) => {
  try {
    const token = bearerFrom(req);
    if (!token) return res.status(401).json({ error: 'Missing Bearer token' });
    // Build path after '/orgs/:orgId/'
    const rest = req.params[0] || '';
    const path = `orgs/${encodeURIComponent(req.params.orgId)}/${rest}`;
    const data = await apiRequestToMinimax({ method: 'GET', path, token, query: req.query });
    res.json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: err.message, details: err?.response?.data || null });
  }
});

// Generic passthrough for POST under /orgs/:orgId/*
router.post('/orgs/:orgId/*', async (req, res) => {
  try {
    const token = bearerFrom(req);
    if (!token) return res.status(401).json({ error: 'Missing Bearer token' });
    const rest = req.params[0] || '';
    const path = `orgs/${encodeURIComponent(req.params.orgId)}/${rest}`;
    const data = await apiRequestToMinimax({ method: 'POST', path, token, body: req.body, query: req.query });
    res.status(201).json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: err.message, details: err?.response?.data || null });
  }
});

// Optionally support PUT for actions like issue postings
router.put('/orgs/:orgId/*', async (req, res) => {
  try {
    const token = bearerFrom(req);
    if (!token) return res.status(401).json({ error: 'Missing Bearer token' });
    const rest = req.params[0] || '';
    const path = `orgs/${encodeURIComponent(req.params.orgId)}/${rest}`;
    const data = await apiRequestToMinimax({ method: 'PUT', path, token, body: req.body, query: req.query });
    res.json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: err.message, details: err?.response?.data || null });
  }
});

module.exports = router;

