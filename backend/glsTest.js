/**
 * Test file for GLS shipping label service
 * 
 * To run this test:
 * 1. Make sure your .env.local has GLS credentials
 * 2. Run: node services/glsTest.js
 */

const glsService = require('./services/glsService');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');


async function testGlsLabelPrinting() {
  logger.info('🚚 Testing GLS Label Printing...');

  try {
    // Sample parcel data
    const parcels = [{
      Content: 'Test Electronics Package',
      Count: 1,
      PickupAddress: {
        Name: 'Fritid Store',
        Street: 'Trubarjeva cesta',
        HouseNumber: '1',
        City: 'Ljubljana',
        ZipCode: '1000',
        CountryIsoCode: 'SI',
        ContactPhone: '+386 1 234 5678',
        ContactEmail: 'info@fritid.si'
      },
      DeliveryAddress: {
        Name: 'Test Customer',
        Street: 'Glavni trg',
        HouseNumber: '5',
        City: 'Maribor',
        ZipCode: '2000',
        CountryIsoCode: 'SI',
        ContactPhone: '+386 40 123 456',
        ContactEmail: 'customer@example.com'
      }
    }];

    console.log('📦 Creating shipping label...');
    const result = await glsService.printLabels(parcels);

    // Check for errors
    if (result.errors && result.errors.length > 0) {
      console.error('❌ GLS API Errors:');
      result.errors.forEach(error => console.error('  -', error));
      return;
    }

    // Save PDF if received
    if (result.pdfBuffer) {
      const outputPath = path.join(__dirname, 'test-gls-label.pdf');
      fs.writeFileSync(outputPath, result.pdfBuffer);
      console.log('✅ Label PDF saved to:', outputPath);
    } else {
      console.log('⚠️  No PDF received from GLS API');
    }

    // Show parcel numbers
    if (result.parcelNumbers && result.parcelNumbers.length > 0) {
      console.log('📋 Tracking Numbers:');
      result.parcelNumbers.forEach(number => console.log('  -', number));
    }

    console.log('🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testOrderToParcel() {
  console.log('\n📋 Testing Order to Parcel conversion...');

  try {
    // Sample order data (like from your checkout form)
    const orderData = {
      firstName: 'Janez',
      lastName: 'Novak',
      email: 'janez.novak@example.com',
      address: 'Celovška cesta 111',
      city: 'Ljubljana',
      postalCode: '1000',
      phoneNumber: '+386 41 123 456',
      content: 'Electronics and accessories',
      count: 2
    };

    // Your store address
    const storeAddress = {
      Name: 'Fritid d.o.o.',
      Street: 'Trubarjeva cesta',
      HouseNumber: '1',
      City: 'Ljubljana',
      ZipCode: '1000',
      CountryIsoCode: 'SI',
      ContactPhone: '+386 1 234 5678',
      ContactEmail: 'info@fritid.si'
    };

    const parcel = glsService.createParcelFromOrder(orderData, storeAddress);
    console.log('✅ Parcel created:');
    console.log(JSON.stringify(parcel, null, 2));

  } catch (error) {
    console.error('❌ Order conversion failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  await testOrderToParcel();
  await testGlsLabelPrinting();
}

runAllTests();