const https = require('https');
const { URL } = require('url');

function httpsRequest(method, urlString, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);

      const options = {
        method,
        hostname: url.hostname,
        path: url.pathname + (url.search || ''),
        headers: headers || {},
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            try {
              resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data || '{}') });
            } catch (e) {
              // Fallback to raw if JSON parse fails
              resolve({ status: res.statusCode, headers: res.headers, data });
            }
          } else {
            resolve({ status: res.statusCode, headers: res.headers, data });
          }
        });
      });

      req.on('error', (err) => reject(err));

      if (body) {
        req.write(body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.export = httpsRequest;