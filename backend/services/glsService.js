const crypto = require('crypto');
const dotenv = require('dotenv');
const logger = require('../logger');


/**
 * Minimal GLS service for printing shipping labels
 */
// Load environment variables
const envPath = "../" + process.env.ENV_PATH;
dotenv.config({ path: envPath });
logger.info(`Loading environment from: ${envPath}`);

const COUNTRY_HOSTS = {
  SI: {
    prod: 'https://api.mygls.si/ParcelService.svc',
    test: 'https://api.test.mygls.si/ParcelService.svc'
  }
};

function hashPassword(plainPassword) {
  return crypto.createHash('sha512').update(plainPassword, 'utf8').digest('base64');
}

class GlsService {
  constructor() {
    this.country = process.env.GLS_COUNTRY || 'SI';
    this.env = process.env.GLS_ENV === 'prod' ? 'prod' : 'test';
    this.baseUrl = COUNTRY_HOSTS[this.country][this.env];
    
    this.username = process.env.GLS_USERNAME;
    this.password = process.env.GLS_PASSWORD_PLAIN;
    this.webshopEngine = process.env.GLS_WEBSHOP_ENGINE || 'Fritid';
    
    if (!this.username || !this.password) {
      throw new Error('GLS_USERNAME and GLS_PASSWORD_PLAIN are required in environment variables');
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
    const payload = {
      Username: this.username,
      Password: hashPassword(this.password),
      WebshopEngine: this.webshopEngine,
      ParcelList: parcels.map(parcel => ({
        ...parcel,
        Count: parcel.Count || 1
      })),
      ShowPrintDialog: false
    };

    try {
      const response = await fetch(`${this.baseUrl}/json/PrintLabels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

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
      console.error('GLS API call failed:', error);
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