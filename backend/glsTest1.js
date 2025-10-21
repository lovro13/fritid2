const dotenv = require('dotenv');

const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });
const BASE = 'https://api.mygls.si/ParcelService.svc';

const crypto = require('crypto');

function sha512Bytes(input) {
    return Array.from(crypto.createHash('sha512').update(input, 'utf8').digest());
}

// Convert Date to WCF JSON format: /Date(milliseconds)/
function toWcfDate(date) {
    return `/Date(${date.getTime()})/`;
}

async function getParcelList(options = {}) {
    const passwordValue = sha512Bytes(process.env.GLS_PASSWORD); // Byte array
    
    // Use valid date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const payloadCore = {
        Username: process.env.GLS_USERNAME,
        Password: passwordValue,
        ClientNumberList: [Number(process.env.GLS_CLIENT_ID)],
        PickupDateFrom: toWcfDate(thirtyDaysAgo),
        PickupDateTo: toWcfDate(today),
        PrintDateFrom: null,
        PrintDateTo: null
    };
    const url = `${BASE}/json/GetParcelList`;
    const body = payloadCore;
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadCore)
    });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = txt; }

    return { status: r.status, ok: r.ok, url, body, data };
}

(async () => {
    const result = await getParcelList();
    console.log('Result:', JSON.stringify(result, null, 2));
})();