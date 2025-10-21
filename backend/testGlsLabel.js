const glsService = require('./services/glsService');
const fs = require('fs');
const path = require('path');

/**
 * Example: Generate a single GLS shipping label
 */
async function testPrintLabel() {
    console.log('🚀 Testing GLS Label Generation...\n');

    // Sample order data
    const parcelData = {
        ClientReference: `ORDER-${Date.now()}`,
        Content: 'TESTTTTT Electronics and Accessories',
        Count: 1,
        
        // Your warehouse/sender address (Fritid)
        PickupAddress: {
            Name: 'TEST',
            Street: 'TEST',
            HouseNumber: '1',
            City: 'KAMNIK',
            ZipCode: '1241',
            CountryIsoCode: 'SI',
            ContactPhone: '+386 1 111 1111',
            ContactEmail: 'info@fritid.si'
        },
        
        // Customer delivery address
        DeliveryAddress: {
            Name: 'TESTJanez',
            Street: 'TEST',
            HouseNumber: '1',
            City: 'Ljubljana',
            ZipCode: '1000',
            CountryIsoCode: 'SI',
            ContactPhone: '+386 41 123 456',
            ContactEmail: 'customer@example.com'
        },
        
        // Optional: Cash on Delivery
        CODAmount: 99.99,
        CODCurrency: 'EUR',
        
        // Optional: Pickup date (defaults to today)
        PickupDate: new Date()
    };

    try {
        const result = await glsService.printLabel(parcelData);

        if (result.success) {
            console.log('✅ Label generated successfully!');
            console.log(`   Parcel Number: ${result.parcelNumber}`);
            console.log(`   Parcel ID: ${result.parcelId}`);
            console.log(`   Client Reference: ${result.clientReference}`);
            console.log(`   PDF Size: ${result.pdfBuffer.length} bytes\n`);

            // Save PDF to file
            const filename = `gls-label-${result.parcelNumber}.pdf`;
            const filepath = glsService.saveLabelToFile(result.pdfBuffer, filename);
            console.log(`💾 Label saved to: ${filepath}`);
            
            return result;
        } else {
            console.error('❌ Failed to generate label:');
            result.errors.forEach(err => {
                console.error(`   [${err.code}] ${err.description}`);
            });
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run tests
(async () => {
    try {
        // Test 1: Print single label
        await testPrintLabel();
        
        // Test 2: Print multiple labels (commented out by default)
        // await testPrintMultipleLabels();
        
        // Test 3: Get parcel list (commented out by default)
        // await testGetParcelList();
        
        console.log('\n✨ Test completed!\n');
    } catch (error) {
        console.error('Fatal error:', error);
    }
})();
