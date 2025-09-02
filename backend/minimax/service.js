const Order = require('../models/Order');
const Product = require('../models/Product');
const { getToken, apiRequestToMinimax: apiRequest } = require('./client');

function cfg(name, def = undefined) {
  const v = process.env[name];
  return v === undefined || v === '' ? def : v;
}

async function buildInvoiceBodyFromOrder(order) {
  const orgId = cfg('MINIMAX_ORG_ID');
  const currencyId = parseInt(cfg('MINIMAX_CURRENCY_ID', '7'), 10);
  const vatPercent = parseFloat(cfg('MINIMAX_VAT_PERCENT', '22'));
  const itemId = parseInt(cfg('MINIMAX_ITEM_ID'), 10);
  const customerId = parseInt(cfg('MINIMAX_CUSTOMER_ID'), 10);
  const paymentMethodId = parseInt(cfg('MINIMAX_PAYMENT_METHOD_ID'), 10);

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
  const dueInDays = parseInt(cfg('MINIMAX_DUE_DAYS', '14'), 10);
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
      UnitOfMeasurement: cfg('MINIMAX_UOM', 'kos'),
      Price: oi.price,
      VATPercent: vatPercent,
    });
  }

  const body = {
    Customer: { ID: customerId },
    DateIssued: today.toISOString().slice(0, 10), // YYYY-MM-DD
    DateDue: due.toISOString().slice(0, 10),
    Currency: { ID: currencyId },
    PricesOnInvoice: cfg('MINIMAX_PRICES_ON_INVOICE', 'N'),
    IssuedInvoiceRows: rows,
    IssuedInvoicePaymentMethods: [
      {
        PaymentMethod: { ID: paymentMethodId },
        Amount: order.totalAmount,
        AlreadyPaid: cfg('MINIMAX_ALREADY_PAID', 'N'),
      }
    ]
  };

  return { orgId, body };
}

async function createInvoiceForOrder({ orderId, bearerToken = null }) {
  if (!orderId) throw new Error('orderId is required');
  const order = await Order.findById(orderId);
  if (!order) {
    const e = new Error('Order not found');
    e.status = 404;
    throw e;
  }
  await order.loadOrderItems();

  const { orgId, body } = await buildInvoiceBodyFromOrder(order);

  let token = bearerToken;
  if (!token) {
    const u = cfg('MINIMAX_USERNAME');
    const p = cfg('MINIMAX_PASSWORD');
    if (!u || !p) throw new Error('Provide Bearer token or set MINIMAX_USERNAME and MINIMAX_PASSWORD');
    const t = await getToken({ username: u, password: p });
    token = t.access_token;
  }

  const result = await apiRequest({
    method: 'POST',
    path: `orgs/${encodeURIComponent(orgId)}/issuedinvoices`,
    token,
    body,
  });

  return { orderId: order.id, invoice: result };
}

module.exports = {
  createInvoiceForOrder,
};

