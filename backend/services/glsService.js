const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });

const BASE = 'https://api.mygls.si/ParcelService.svc';

const crypto = require('crypto');

// SHA-512 as byte array (required by GLS API)
function sha512Bytes(input) {
    return Array.from(crypto.createHash('sha512').update(input, 'utf8').digest());
}

// Convert Date to WCF JSON format: /Date(milliseconds)/
function toWcfDate(date) {
    return `/Date(${date.getTime()})/`;
}

class GlsService {
    constructor() {
        this.username = process.env.GLS_USERNAME;
        this.password = process.env.GLS_PASSWORD;
        this.clientNumber = Number(process.env.GLS_CLIENT_ID);
        this.webshopEngine = process.env.GLS_WEBSHOP_ENGINE || 'Fritid';
        // Use A4 format for viewable PDF (available options: A4_2x2, A4_4x1, Connect, Thermo, ThermoZPL)
        this.typeOfPrinter = 'A4_4x1'; // Force A4 PDF format
        this.baseUrl = BASE;

        if (!this.username || !this.password || !this.clientNumber) {
            throw new Error('GLS credentials not configured. Check GLS_USERNAME, GLS_PASSWORD, GLS_CLIENT_ID in .env');
        }
    }

    /**
     * Generate shipping label PDF for a parcel
     * 
     * @param {Object} parcel - Parcel data
     * @param {string} parcel.ClientReference - Your order/tracking reference
     * @param {string} parcel.Content - Package content description
     * @param {number} [parcel.Count=1] - Number of parcels
     * @param {Object} parcel.PickupAddress - Sender address (your warehouse)
     * @param {Object} parcel.DeliveryAddress - Customer delivery address
     * @param {number} [parcel.CODAmount] - Cash on delivery amount (optional)
     * @param {string} [parcel.CODCurrency='EUR'] - COD currency (optional)
     * @param {Date} [parcel.PickupDate] - Pickup date (optional, defaults to today)
     * 
     * @returns {Promise<Object>} Result with pdfBuffer, parcelNumber, parcelId, and errors
     * 
     * @example
     * const result = await glsService.printLabel({
     *   ClientReference: 'ORDER-12345',
     *   Content: 'Electronics',
     *   Count: 1,
     *   PickupAddress: {
     *     Name: 'FRITID d.o.o.',
     *     Street: 'Ljubljanska cesta',
     *     HouseNumber: '45',
     *     City: 'KAMNIK',
     *     ZipCode: '1241',
     *     CountryIsoCode: 'SI',
     *     ContactPhone: '+386 1 234 5678',
     *     ContactEmail: 'info@fritid.si'
     *   },
     *   DeliveryAddress: {
     *     Name: 'Janez Novak',
     *     Street: 'Celovška cesta',
     *     HouseNumber: '111',
     *     City: 'Ljubljana',
     *     ZipCode: '1000',
     *     CountryIsoCode: 'SI',
     *     ContactPhone: '+386 41 123 456',
     *     ContactEmail: 'customer@example.com'
     *   },
     *   CODAmount: 99.99,
     *   CODCurrency: 'EUR'
     * });
     */
    async printLabel(parcel) {
        // Build the parcel data with required fields
        const parcelData = {
            ClientNumber: this.clientNumber,
            ClientReference: parcel.ClientReference || `GLS-${Date.now()}`,
            Content: parcel.Content || 'Package',
            Count: parcel.Count || 1,
            PickupAddress: parcel.PickupAddress,
            DeliveryAddress: parcel.DeliveryAddress,
            PickupDate: parcel.PickupDate ? toWcfDate(parcel.PickupDate) : toWcfDate(new Date())
        };

        // Add COD (Cash on Delivery) if specified
        if (parcel.CODAmount && parcel.CODAmount > 0) {
            parcelData.CODAmount = parcel.CODAmount;
            parcelData.CODCurrency = parcel.CODCurrency || 'EUR';
            parcelData.CODReference = parcel.ClientReference;
            parcelData.ServiceList = [{
                Code: 'COD'
            }];
        }

        // Build PrintLabels request
        const request = {
            Username: this.username,
            Password: sha512Bytes(this.password),
            ClientNumberList: [this.clientNumber],
            WebshopEngine: this.webshopEngine,
            ParcelList: [parcelData],
            TypeOfPrinter: this.typeOfPrinter,
            ShowPrintDialog: false,
            PrintPosition: 1
        };

        try {
            const url = `${this.baseUrl}/json/PrintLabels`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });

            const data = await response.json();

            // Check for errors
            if (data.PrintLabelsErrorList && data.PrintLabelsErrorList.length > 0) {
                return {
                    success: false,
                    errors: data.PrintLabelsErrorList.map(err => ({
                        code: err.ErrorCode,
                        description: err.ErrorDescription
                    }))
                };
            }

            // Extract label info
            const labelInfo = data.PrintLabelsInfoList && data.PrintLabelsInfoList[0];
            const pdfBuffer = data.Labels ? Buffer.from(data.Labels, 'base64') : null;

            return {
                success: true,
                pdfBuffer: pdfBuffer,
                parcelId: labelInfo?.ParcelId,
                parcelNumber: labelInfo?.ParcelNumber,
                clientReference: labelInfo?.ClientReference,
                errors: []
            };

        } catch (error) {
            return {
                success: false,
                errors: [{
                    code: 'API_ERROR',
                    description: error.message
                }]
            };
        }
    }

    /**
     * Save label PDF to file
     * 
     * @param {Buffer} pdfBuffer - PDF buffer from printLabel
     * @param {string} filename - Output filename
     * @returns {string} Full path to saved file
     */
    saveLabelToFile(pdfBuffer, filename = 'gls-label.pdf') {
        const outputPath = path.join(__dirname, '..', 'uploads', filename);
        
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, pdfBuffer);
        return outputPath;
    }

    async getParcelList(fromDate, toDate) {
        const request = {
            Username: this.username,
            Password: sha512Bytes(this.password),
            ClientNumberList: [this.clientNumber],
            PickupDateFrom: toWcfDate(fromDate),
            PickupDateTo: toWcfDate(toDate),
            PrintDateFrom: null,
            PrintDateTo: null
        };

        try {
            const url = `${this.baseUrl}/json/GetParcelList`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });

            const data = await response.json();

            if (data.GetParcelListErrors && data.GetParcelListErrors.length > 0) {
                return {
                    success: false,
                    errors: data.GetParcelListErrors.map(err => ({
                        code: err.ErrorCode,
                        description: err.ErrorDescription
                    }))
                };
            }

            return {
                success: true,
                parcels: data.PrintDataInfoList || [],
                errors: []
            };

        } catch (error) {
            return {
                success: false,
                errors: [{
                    code: 'API_ERROR',
                    description: error.message
                }]
            };
        }
    }
}

module.exports = new GlsService();