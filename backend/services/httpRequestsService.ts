// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import https from 'https';
import { URL } from 'url';
import logger from '../logger';


const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL;
const MINIMAX_BASIC_B64 = process.env.MINIMAX_BASIC_B64 || '';

function httpsRequest(method: string, urlString: string, headers: Record<string, any> = {}, body: any = null): Promise<any> {
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

export async function getToken({ username, password }: { username: string; password: string; }) {
  logger.info("getToken called")
  if (!MINIMAX_BASIC_B64) {
    throw new Error('MINIMAX_BASIC_B64 env is required for Basic Authorization');
  }
  if (!username || !password) {
    throw new Error('username and password are required');
  }

  const form = new URLSearchParams();
  form.set('grant_type', 'password');
  form.set('username', username);
  form.set('password', password);

  const url = `${MINIMAX_BASE_URL}/AUT/OAuth20/Token`;
  const headers = {
    'Authorization': `Basic ${MINIMAX_BASIC_B64}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(form.toString()),
  };
  try {
    const res = await httpsRequest('POST', url, headers, form.toString());
    logger.info('Minimax token response received', { status: res.status });

    if (res.status < 200 || res.status >= 300) {
      logger.error(`Token request failed with status ${res.status}:`, res.data);
      const error = new Error(`Failed to obtain token. Status: ${res.status}`);
      error.response = res;
      throw error;
    }
    return res.data;
  } catch (error) {
    logger.error('Token request error:', error.message);
    if (error.response) {
      logger.error('Error response:', error.response);
    }
    throw error;
  }
}

export async function apiRequestToMinimax({ method = 'GET', path, token, query = {}, body = null }: { method?: string; path: string; token: string; query?: Record<string, any>; body?: any; }): Promise<[any, any]> {
  if (!token) {
    throw new Error('Bearer token is required');
  }
  if (!path) {
    throw new Error('API path is required');
  }

  const qs = new URLSearchParams(query);
  const q = qs.toString();
  const url = `${MINIMAX_BASE_URL}/API/api/${path}${q ? `?${q}` : ''}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  let payload = null;
  if (body) {
    payload = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(payload);
  }

  const res = await httpsRequest(method, url, headers, payload);
  // Bubble up non-2xx as errors to the router to map status codes
  if (res.status < 200 || res.status >= 300) {
    const error = new Error('Minimax API request failed', res);
    logger.info(`Minimax API ${method} ${path} failed with status ${res.status}:`, res.data);
    error.response = res;
    throw error;
  }
  // logger.info(`Minimax API ${method} ${path} response: ${JSON.stringify(res)}`);
  return [res.data, res.headers];
}

export { httpsRequest };
export default { httpsRequest, getToken, apiRequestToMinimax };
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = { httpsRequest, getToken, apiRequestToMinimax };
