const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User')
const logger = require('../logger');
const { httpsRequest } = require('./httpRequestsService')


const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL;
const MINIMAX_BASIC_B64 = process.env.MINIMAX_BASIC_B64 || '';



async function getToken({ username, password }) {
  logger.info("getToken called")
  if (!MINIMAX_BASIC_B64) {
    throw new Error('MINIMAX_BASIC_B64 env is required for Basic Authorization');
  }
  if (!username || !password) {
    throw new Error('username and password are required');
  }

  const form = new URLSearchParams();
  form.set('grant_type', 'password');
  form.set('username', username);
  form.set('password', password);

  const url = `${MINIMAX_BASE_URL}/AUT/OAuth20/Token`;
  const headers = {
    'Authorization': `Basic ${MINIMAX_BASIC_B64}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(form.toString()),
  };
  logger.info('Token request headers:', headers);
  
  try {
    const res = await httpsRequest('POST', url, headers, form.toString());
    logger.info(`Token response status: ${res.status}`);
    
    if (res.status < 200 || res.status >= 300) {
      logger.error(`Token request failed with status ${res.status}:`, res.data);
      const error = new Error(`Failed to obtain token. Status: ${res.status}`);
      error.response = res;
      throw error;
    }
    return res.data;
  } catch (error) {
    logger.error('Token request error:', error.message);
    if (error.response) {
      logger.error('Error response:', error.response);
    }
    throw error;
  }
}

async function apiRequestToMinimax({ method = 'GET', path, token, query = {}, body = null }) {
  if (!token) {
    throw new Error('Bearer token is required');
  }
  if (!path) {
    throw new Error('API path is required');
  }

  const qs = new URLSearchParams(query);
  const q = qs.toString();
  const url = `${MINIMAX_BASE_URL}/API/api/${path}${q ? `?${q}` : ''}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  let payload = null;
  if (body) {
    payload = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(payload);
  }

  const res = await httpsRequest(method, url, headers, payload);
  // Bubble up non-2xx as errors to the router to map status codes
  if (res.status < 200 || res.status >= 300) {
    const error = new Error('Minimax API request failed');
    error.response = res;
    throw error;
  }
  return res.data;
}


async function buildInvoiceBodyFromOrder(order) {
  const currencyId = parseInt(process.envMINIMAX_CURRENCY_ID, 10);
  const vatPercent = parseFloat(process.env.MINIMAX_VAT_PERCENT);
  const itemId = parseInt(process.env.MINIMAX_ITEM_ID, 10);
  const customerId = parseInt(process.env.MINIMAX_CUSTOMER_ID, 10);
  const paymentMethodId = parseInt(process.env.MINIMAX_PAYMENT_METHOD_ID, 10);

  if (!orgId) throw new Error('MINIMAX_ORG_ID not set');
  if (!itemId) throw new Error('MINIMAX_ITEM_ID not set');
  if (!customerId) throw new Error('MINIMAX_CUSTOMER_ID not set');
  if (!paymentMethodId) throw new Error('MINIMAX_PAYMENT_METHOD_ID not set');

  // Ensure orderItems with product names are loaded
  if (!order.orderItems || order.orderItems.length === 0) {
    await order.loadOrderItems();
  }

  const today = new Date();
  const due = new Date(today);
  const dueInDays = parseInt(process.env.MINIMAX_DUE_DAYS, 10);
  due.setDate(today.getDate() + dueInDays);

  const rows = [];
  for (const oi of order.orderItems) {
    let productName = oi.productName;
    if (!productName) {
      const p = await Product.findById(oi.productId);
      productName = p?.name || `Product ${oi.productId}`;
    }
    rows.push({
      Item: { ID: itemId },
      Description: `${productName} (Order ${order.id})`,
      Quantity: oi.quantity,
      UnitOfMeasurement: process.env.MINIMAX_UOM,
      Price: oi.price,
      VATPercent: vatPercent,
    });
  }

  const body = {
    Customer: { ID: customerId },
    DateIssued: today.toISOString().slice(0, 10), // YYYY-MM-DD
    DateDue: due.toISOString().slice(0, 10),
    Currency: { ID: currencyId },
    PricesOnInvoice: process.env.MINIMAX_PRICES_ON_INVOICE,
    IssuedInvoiceRows: rows,
    IssuedInvoicePaymentMethods: [
      {
        PaymentMethod: { ID: paymentMethodId },
        Amount: order.totalAmount,
        AlreadyPaid: process.env.MINIMAX_ALREADY_PAID,
      }
    ]
  };

  return body;
}

async function createInvoiceForOrder({ orderId, bearerToken = null }) {
  if (!orderId) throw new Error('orderId is required');
  const order = await Order.findById(orderId);
  const orgId = process.env.MINIMAX_ORG_ID;
  if (!order) {
    const e = new Error('Order not found');
    e.status = 404;
    throw e;
  }
  await order.loadOrderItems();

  const body = await buildInvoiceBodyFromOrder(order);

  let token = bearerToken;
  if (!token) {
    const u = process.env.MINIMAX_USERNAME;
    const p = process.env.MINIMAX_PASSWORD;
    if (!u || !p) throw new Error('Provide Bearer token or set MINIMAX_USERNAME and MINIMAX_PASSWORD');
    const t = await getToken({ username: u, password: p });
    token = t.access_token;
    logger.info("Created new token")
  }
  
  logger.info("Sending request to minimax to make invoice with body", body)
  
  try {
    const result = await apiRequestToMinimax({
      method: 'POST',
      path: `orgs/${encodeURIComponent(orgId)}/issuedinvoices`,
      token,
      body,
    });
    logger.info("Successfully made invoice in minimax")
    return { orderId: order.id, invoice: result };
  } catch (error) {
    // If token is invalid and we used bearerToken, try with fresh env token
    if (error?.response?.status === 401 && bearerToken) {
      logger.info("Bearer token invalid, trying with fresh env token");
      const u = process.env.MINIMAX_USERNAME;
      const p = process.env.MINIMAX_PASSWORD;
      if (u && p) {
        const t = await getToken({ username: u, password: p });
        const result = await apiRequestToMinimax({
          method: 'POST',
          path: `orgs/${encodeURIComponent(orgId)}/issuedinvoices`,
          token: t.access_token,
          body,
        });
        logger.info("Successfully made invoice in minimax with fresh token")
        return { orderId: order.id, invoice: result };
      }
    }
    throw error;
  }
}

async function createNewCustomer({customerId, bearerToken = null}) {
  if (!customerId) throw new Error('customerId is required');
  
  const orgId = process.env.MINIMAX_ORG_ID;
  if (!orgId) throw new Error('MINIMAX_ORG_ID not set');

  const code = "api" + customerId;
  const user = await User.findById(customerId);
  
  if (!user) {
    const e = new Error('User not found');
    e.status = 404;
    throw e;
  }

  const fullName = (user.firstName || '') + ' ' + (user.lastName || '');
  const address = user.address || '';
  const postalCode = user.postalCode || '';
  const city = user.city || '';
  
  const body = {
    Code: code,
    Name: fullName.trim(),
    Address: address,
    PostalCode: postalCode,
    City: city
  };

  let token = bearerToken;
  if (!token) {
    const u = process.env.MINIMAX_USERNAME;
    const p = process.env.MINIMAX_PASSWORD;
    if (!u || !p) throw new Error('Provide Bearer token or set MINIMAX_USERNAME and MINIMAX_PASSWORD');
    const t = await getToken({ username: u, password: p });
    token = t.access_token;
    logger.info("Created new token for customer creation");
  }

  logger.info("Sending request to minimax to create customer with body", body);

  try {
    const result = await apiRequestToMinimax({
      method: 'POST',
      path: `orgs/${encodeURIComponent(orgId)}/customers`,
      token,
      body,
    });
    logger.info("Successfully created customer in minimax");
    return { customerId: user.id, customer: result };
  } catch (error) {
    // If token is invalid and we used bearerToken, try with fresh env token
    if (error?.response?.status === 401 && bearerToken) {
      logger.info("Bearer token invalid, trying with fresh env token for customer creation");
      const u = process.env.MINIMAX_USERNAME;
      const p = process.env.MINIMAX_PASSWORD;
      if (u && p) {
        const t = await getToken({ username: u, password: p });
        const result = await apiRequestToMinimax({
          method: 'POST',
          path: `orgs/${encodeURIComponent(orgId)}/customers`,
          token: t.access_token,
          body,
        });
        logger.info("Successfully created customer in minimax with fresh token");
        return { customerId: user.id, customer: result };
      }
    }
    throw error;
  }
}

module.exports = {
  getToken,
  createInvoiceForOrder,
  apiRequestToMinimax,
  createNewCustomer
};

