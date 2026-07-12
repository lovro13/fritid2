"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = exports.apiRequestToMinimax = void 0;
exports.buildInvoiceRowsFromCart = buildInvoiceRowsFromCart;
exports.createNewCustomer = createNewCustomer;
exports.getCustomerId = getCustomerId;
const Product_1 = __importDefault(require("../models/Product"));
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../logger"));
const httpRequestsService_1 = require("./httpRequestsService");
Object.defineProperty(exports, "apiRequestToMinimax", { enumerable: true, get: function () { return httpRequestsService_1.apiRequestToMinimax; } });
Object.defineProperty(exports, "getToken", { enumerable: true, get: function () { return httpRequestsService_1.getToken; } });
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL;
const MINIMAX_BASIC_B64 = process.env.MINIMAX_BASIC_B64 || '';
const FOOD_CONTACT_TEXT = 'Izdelek ustreza pogojem za stik z živili.';
function sanitizeCodePart(value) {
    return value
        .trim()
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase();
}
function extractItemIdFromLocation(locationHeader) {
    if (!locationHeader)
        return null;
    const match = locationHeader.match(/\/items\/(\d+)/);
    return match ? match[1] : null;
}
function isDuplicateCodeError(error) {
    const status = error?.response?.status;
    if (status === 409)
        return true;
    const data = error?.response?.data;
    const message = typeof data === 'string' ? data : JSON.stringify(data || '');
    return /sifra|šifra|code|exists/i.test(message);
}
async function buildInvoiceRowsFromCart({ cartItemsProducts, vatPercent, token }) {
    const orgId = process.env.MINIMAX_ORG_ID;
    if (!orgId)
        throw new Error('MINIMAX_ORG_ID not set');
    if (!process.env.MINIMAX_VAT_RATE_ID)
        throw new Error('MINIMAX_VAT_RATE_ID not set');
    const currencyId = process.env.MINIMAX_CURRENCY_ID;
    const itemType = 'I';
    const itemUsage = 'D';
    const unitOfMeasurement = 'kos';
    const invoiceRows = [];
    const itemIdCache = new Map();
    for (let index = 0; index < cartItemsProducts.length; index += 1) {
        const item = cartItemsProducts[index];
        let minimaxItemId = item.minimax_id || itemIdCache.get(item.id) || null;
        if (!minimaxItemId) {
            const priceWithVat = parseFloat(String(item.price));
            const priceWithoutVat = priceWithVat / (1 + vatPercent / 100);
            const baseDesc = item.description || item.name;
            const description = [baseDesc, FOOD_CONTACT_TEXT].filter(Boolean).join(' ');
            const baseBody = {
                Name: item.name,
                Description: description,
                ItemType: itemType,
                UnitOfMeasurement: unitOfMeasurement,
                VatRate: { ID: process.env.MINIMAX_VAT_RATE_ID },
                Usage: itemUsage,
                Currency: { ID: currencyId },
                Price: priceWithoutVat
            };
            const baseCode = `ITEM_${item.id}`;
            const codesToTry = [baseCode,
                `${baseCode}_1`,
                `${baseCode}_2`,
                `${baseCode}_3`,
                `${baseCode}_4`,
                `${baseCode}_5`];
            let result = null;
            let headers = null;
            let usedCode = baseCode;
            for (let attempt = 0; attempt < codesToTry.length; attempt += 1) {
                const code = codesToTry[attempt];
                usedCode = code;
                try {
                    logger_1.default.info('Creating Minimax item for product', { productId: item.id, code, attempt });
                    [result, headers] = await (0, httpRequestsService_1.apiRequestToMinimax)({
                        method: 'POST',
                        path: `orgs/${encodeURIComponent(orgId)}/items`,
                        token,
                        body: { ...baseBody, Code: code }
                    });
                    break;
                }
                catch (error) {
                    if (isDuplicateCodeError(error) && attempt < codesToTry.length - 1) {
                        logger_1.default.warn('Minimax item code already exists, retrying', { productId: item.id, code, attempt });
                        continue;
                    }
                    throw error;
                }
            }
            if (!result) {
                throw new Error(`Failed to create Minimax item for product ${item.id} after trying ${codesToTry.join(', ')}`);
            }
            minimaxItemId =
                result?.ItemId ||
                    result?.Item?.ID ||
                    result?.ID ||
                    extractItemIdFromLocation(headers?.location);
            if (!minimaxItemId) {
                throw new Error(`Failed to extract Minimax item ID for product ${item.id}`);
            }
            logger_1.default.info('Minimax item created', { productId: item.id, code: usedCode, minimaxItemId });
            try {
                await Product_1.default.updateMinimaxId(item.id, minimaxItemId);
            }
            catch (updateError) {
                logger_1.default.warn('Failed to persist minimax_id on product', { productId: item.id, minimaxItemId });
            }
        }
        if (minimaxItemId) {
            itemIdCache.set(item.id, minimaxItemId);
        }
        const colorLabel = item.color || item.selectedColor || '';
        const colorPart = colorLabel ? sanitizeCodePart(String(colorLabel)) : '';
        const itemName = colorLabel ? `${item.name} - ${colorLabel}` : item.name;
        const itemCode = colorPart ? `ITEM_${item.id}_${colorPart}` : `ITEM_${item.id}`;
        const rowBaseDesc = (item.description || item.name) + '. ';
        const rowDescription = [rowBaseDesc, FOOD_CONTACT_TEXT].filter(Boolean).join(' ');
        const priceWithVat = parseFloat(String(item.price));
        const priceWithoutVat = priceWithVat / (1 + vatPercent / 100);
        const totalValueWithVat = priceWithVat * item.quantity;
        invoiceRows.push({
            Item: { ID: minimaxItemId || process.env.MINIMAX_ITEM_ID },
            ItemName: itemName,
            RowNumber: index + 1,
            ItemCode: itemCode,
            Description: rowDescription,
            Quantity: item.quantity,
            UnitOfMeasurement: unitOfMeasurement,
            Price: priceWithoutVat,
            PriceWithVAT: priceWithVat,
            VATPercent: vatPercent,
            Discount: 0,
            DiscountPercent: 0,
            Value: totalValueWithVat,
            VatRate: { ID: process.env.MINIMAX_VAT_RATE_ID }
        });
    }
    return invoiceRows;
}
async function createNewCustomer({ customerId, bearerToken = null }) {
    if (!customerId)
        throw new Error('customerId is required');
    const orgId = process.env.MINIMAX_ORG_ID;
    if (!orgId)
        throw new Error('MINIMAX_ORG_ID not set');
    const code = "api" + customerId;
    const user = await User_1.default.findById(customerId);
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
    logger_1.default.info('Creating Minimax customer', { customerId });
    let token = bearerToken;
    if (!token) {
        const u = process.env.MINIMAX_USERNAME;
        const p = process.env.MINIMAX_PASSWORD;
        if (!u || !p)
            throw new Error('Provide Bearer token or set MINIMAX_USERNAME and MINIMAX_PASSWORD');
        const t = await (0, httpRequestsService_1.getToken)({ username: u, password: p });
        token = t.access_token;
        logger_1.default.info("Created new token for customer creation");
    }
    try {
        const [result, _] = await (0, httpRequestsService_1.apiRequestToMinimax)({
            method: 'POST',
            path: `orgs/${encodeURIComponent(orgId)}/customers`,
            token,
            body,
        });
        logger_1.default.info("Successfully created customer in minimax");
        logger_1.default.info('Minimax customer created', { customerId: user.id });
        return { customerId: user.id, customer: result };
    }
    catch (error) {
        throw error;
    }
}
async function getCustomerId(user) {
    // Gets customer id of an order or creates it
    logger_1.default.info('getCustomerId called with user.id:', user.id);
    const orgId = process.env.MINIMAX_ORG_ID;
    let code = "api" + user.id;
    // Get token for API requests
    let token;
    const u = process.env.MINIMAX_USERNAME;
    const p = process.env.MINIMAX_PASSWORD;
    if (!u || !p)
        throw new Error('MINIMAX_USERNAME and MINIMAX_PASSWORD required');
    const t = await (0, httpRequestsService_1.getToken)({ username: u, password: p });
    token = t.access_token;
    // First try to find if customer already exists in minimax system
    try {
        logger_1.default.info(`Checking if customer with code '${code}' exists in Minimax`);
        const [existingCustomer, _] = await (0, httpRequestsService_1.apiRequestToMinimax)({
            method: 'GET',
            path: `orgs/${encodeURIComponent(orgId)}/customers/code(${encodeURIComponent(code)})`,
            token,
        });
        if (existingCustomer && existingCustomer.CustomerId) {
            logger_1.default.info(`Found existing customer in Minimax with ID: ${existingCustomer.CustomerId}`);
            return existingCustomer.CustomerId;
        }
    }
    catch (error) {
        // Customer doesn't exist (404) or other error - we'll create new one
        logger_1.default.info(`Customer with code '${code}' not found in Minimax, will create new one`);
    }
    // If customer doesn't exist, create new customer
    try {
        logger_1.default.info(`Creating new customer in Minimax for user ID: ${user.id}`);
        const res = await createNewCustomer({
            customerId: user.id,
            bearerToken: token
        });
        logger_1.default.info("Created new customer in Minimax");
        const [newCustomer, headers] = await (0, httpRequestsService_1.apiRequestToMinimax)({
            method: 'GET',
            path: `orgs/${encodeURIComponent(orgId)}/customers/code(${encodeURIComponent(code)})`,
            token,
        });
        logger_1.default.info(`Successfully created new customer with ID: ${newCustomer.CustomerId}`);
        return newCustomer.CustomerId;
    }
    catch (createError) {
        logger_1.default.error('Failed to create new customer', { customerId: user.id });
        throw createError;
    }
}
