const crypto = require('crypto');
const dotenv = require('dotenv');
const logger = require('../logger');


/**
 * Minimal GLS service for printing shipping labels
 */
// Load environment variables
const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });
logger.info(`Loading environment from: ${envPath}`);

const COUNTRY_HOSTS = {
    SI: {
        prod: 'https://api.mygls.si/ParcelService.svc',
        test: 'https://api.test.mygls.si/ParcelService.svc'
    }
};

// Create password as byte array (as per GLS C# API documentation)
function hashPasswordToByteArray(plainPassword) {
    const hash = crypto.createHash('sha512').update(plainPassword, 'utf8').digest();
    return Array.from(hash); // Convert Buffer to byte array
}

// Legacy base64 method for fallback
function hashPassword(plainPassword) {
    return crypto.createHash('sha512').update(plainPassword, 'utf8').digest('base64');
}

class GlsService {
    constructor() {
        this.country = process.env.GLS_COUNTRY;
        this.env = process.env.GLS_ENV;
        this.baseUrl = COUNTRY_HOSTS[this.country][this.env];

        this.username = process.env.GLS_USERNAME;
        this.password = process.env.GLS_PASSWORD_PLAIN;
        this.webshopEngine = process.env.GLS_WEBSHOP_ENGINE;
        this.clientNumber = parseInt(process.env.GLS_CLIENT_NUMBER_TEST);

        if (!this.username || !this.password) {
            throw new Error('GLS_USERNAME and GLS_PASSWORD_PLAIN are required in environment variables');
        }
        
        if (!this.clientNumber) {
            logger.warn('GLS_CLIENT_NUMBER not set - you need to get this from GLS support');
        }
    }

    /**
     * Print shipping labels for parcels
     * 
     * @param {Array} parcels - Array of parcel objects
     * @param {Object} parcels[].PickupAddress - Pickup address
     * @param {Object} parcels[].DeliveryAddress - Delivery address  
     * @param {string} parcels[].Content - Package content description
     * @param {number} [parcels[].Count=1] - Number of packages
     * 
     * @returns {Promise<Object>} Result with pdfBuffer, parcelNumbers, and errors
     * 
     * @example
     * const result = await glsService.printLabels([{
     *   Content: 'Electronics',
     *   PickupAddress: {
     *     Name: 'Fritid Store',
     *     Street: 'Trubarjeva cesta',
     *     HouseNumber: '1',
     *     City: 'Ljubljana',
     *     ZipCode: '1000',
     *     CountryIsoCode: 'SI'
     *   },
     *   DeliveryAddress: {
     *     Name: 'Customer Name',
     *     Street: 'Glavni trg',
     *     HouseNumber: '5',
     *     City: 'Maribor',
     *     ZipCode: '2000', 
     *     CountryIsoCode: 'SI'
     *   }
     * }]);
     */
    async printLabels(parcels) {
        if (!this.clientNumber) {
            throw new Error('GLS_CLIENT_NUMBER is required. Please contact GLS to get your client number.');
        }

        // Create request matching GLS C# API structure
        const requestData = {
            // APIRequestBase properties
            ClientNumberList: [this.clientNumber],
            Password: hashPasswordToByteArray(this.password),
            Username: this.username,
            WebshopEngine: this.webshopEngine,
            
            // PrintLabelsRequest properties
            ParcelList: parcels.map(parcel => ({
                ...parcel,
                ClientNumber: this.clientNumber,
                ClientReference: parcel.ClientReference || `FRITID-${Date.now()}`,
                Count: parcel.Count || 1
            })),
            TypeOfPrinter: process.env.GLS_DEFAULT_PRINTER,
            ShowPrintDialog: false
        };

        try {
            logger.info('Sending PrintLabels request to GLS API', { 
                parcelCount: parcels.length, 
                baseUrl: this.baseUrl,
                environment: this.env,
                clientNumber: this.clientNumber,
                payloadKeys: Object.keys(requestData)
            });
            
            const response = await fetch(`${this.baseUrl}/ParcelService.svc/json/PrintLabels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            logger.info('Received response from GLS API for PrintLabels', data);

            const result = {
                parcelNumbers: [],
                errors: []
            };

            // Extract PDF if available
            if (data.Labels) {
                result.pdfBuffer = Buffer.from(data.Labels, 'base64');
            }

            // Extract parcel numbers
            if (data.PrintLabelsInfoList) {
                result.parcelNumbers = data.PrintLabelsInfoList.map(info => info.ParcelNumber);
            }

            // Extract errors
            if (data.PrintLabelsErrorList) {
                result.errors = data.PrintLabelsErrorList.map(error =>
                    `${error.ErrorCode}: ${error.ErrorDescription}`
                );
            }

            return result;
        } catch (error) {
            logger.error('GLS API call failed', {
                error: error.message,
                baseUrl: this.baseUrl,
                parcelCount: parcels.length
            });
            throw new Error(`GLS API call failed: ${error.message}`);
        }
    }

    /**
     * Create a simple parcel object from order data
     * 
     * @param {Object} orderData - Order information
     * @param {Object} senderAddress - Pickup address (your store)
     * @returns {Object} Parcel object ready for GLS API
     */
    createParcelFromOrder(orderData, senderAddress) {
        return {
            Content: orderData.content || 'General merchandise',
            Count: orderData.count || 1,
            PickupAddress: {
                Name: senderAddress.Name || 'Fritid Store',
                Street: senderAddress.Street || 'Store Street',
                HouseNumber: senderAddress.HouseNumber || '1',
                City: senderAddress.City || 'Ljubljana',
                ZipCode: senderAddress.ZipCode || '1000',
                CountryIsoCode: senderAddress.CountryIsoCode || 'SI',
                ContactPhone: senderAddress.ContactPhone,
                ContactEmail: senderAddress.ContactEmail
            },
            DeliveryAddress: {
                Name: `${orderData.firstName} ${orderData.lastName}`.trim(),
                Street: orderData.address,
                HouseNumber: orderData.houseNumber || '1',
                City: orderData.city,
                ZipCode: orderData.postalCode,
                CountryIsoCode: orderData.countryCode || 'SI',
                ContactPhone: orderData.phoneNumber,
                ContactEmail: orderData.email
            }
        };
    }
}

module.exports = new GlsService();