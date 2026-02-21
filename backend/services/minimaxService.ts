// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import logger from '../logger';
import { apiRequestToMinimax, getToken, httpsRequest } from './httpRequestsService';


const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL;
const MINIMAX_BASIC_B64 = process.env.MINIMAX_BASIC_B64 || '';

export async function createNewCustomer({ customerId, bearerToken = null }: { customerId: number; bearerToken?: string | null; }) {
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

  const fullName = (user.firstName) + ' ' + (user.lastName);
  const address = user.address;
  const postalCode = user.postalCode;
  const city = user.city;
  const currencyId = parseInt(process.env.MINIMAX_CURRENCY_ID, 10);
  const countryId = parseInt(process.env.MINIMAX_COUNTRY_SLOVENIA_ID, 10);

  const body = {
    Code: code,
    Currency: { ID: currencyId },
    Country: { ID: countryId },
    Name: fullName.trim(),
    Address: address,
    PostalCode: postalCode,
    City: city,
    Usage: "K",
    SubjectToVAT: "N",
    TaxNumber: ""
  };
  logger.info("Trying to create a customer with body", body)
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
    const [result, _] = await apiRequestToMinimax({
      method: 'POST',
      path: `orgs/${encodeURIComponent(orgId)}/customers`,
      token,
      body,
    });
    logger.info("Successfully created customer in minimax");
    logger.info("returning user id and customer info", user.id, result);
    return { customerId: user.id, customer: result };
  } catch (error) {
    throw error;
  }
}

export async function getCustomerId(user: any) {
  // Gets customer id of an order or creates it
  logger.info('getCustomerId called with user.id:', user.id);

  const orgId = process.env.MINIMAX_ORG_ID;
  let code = "api" + user.id;

  // Get token for API requests
  let token;
  const u = process.env.MINIMAX_USERNAME;
  const p = process.env.MINIMAX_PASSWORD;
  if (!u || !p) throw new Error('MINIMAX_USERNAME and MINIMAX_PASSWORD required');
  const t = await getToken({ username: u, password: p });
  token = t.access_token;

  // First try to find if customer already exists in minimax system
  try {
    logger.info(`Checking if customer with code '${code}' exists in Minimax`);

    const [existingCustomer, _] = await apiRequestToMinimax({
      method: 'GET',
      path: `orgs/${encodeURIComponent(orgId)}/customers/code(${encodeURIComponent(code)})`,
      token,
    });

    if (existingCustomer && existingCustomer.CustomerId) {
      logger.info(`Found existing customer in Minimax with ID: ${existingCustomer.CustomerId}`);
      return existingCustomer.CustomerId;
    }
  } catch (error) {
    // Customer doesn't exist (404) or other error - we'll create new one
    logger.info(`Customer with code '${code}' not found in Minimax, will create new one`);
  }

  // If customer doesn't exist, create new customer
  try {
    logger.info(`Creating new customer in Minimax for user ID: ${user.id}`);
    const res = await createNewCustomer({
      customerId: user.id,
      bearerToken: token
    });
    logger.info("Created new customer in Minimax");
    const [newCustomer, headers] = await apiRequestToMinimax({
      method: 'GET',
      path: `orgs/${encodeURIComponent(orgId)}/customers/code(${encodeURIComponent(code)})`,
      token,
    });
    logger.info(`Successfully created new customer with ID: ${newCustomer.CustomerId}`);
    return newCustomer.CustomerId;

  } catch (createError) {
    logger.error('Failed to create new customer:', createError);
    throw createError;
  }
}

export { apiRequestToMinimax, getToken };
