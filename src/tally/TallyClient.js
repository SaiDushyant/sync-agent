const http = require('http');

class TallyClient {
  constructor(config) {
    this.host = config.TALLY_HOST;
    this.port = config.TALLY_PORT;
    this.timeout = config.requestTimeout;
  }

  sendRequest(xmlData) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'Content-Length': Buffer.byteLength(xmlData)
        },
        timeout: this.timeout
      };

      const req = http.request(options, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`TallyClient HTTP Error: Invalid status code ${res.statusCode} from ${this.host}:${this.port}`));
        }

        let data = '';
        res.setEncoding('utf8');
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (!data || data.trim() === '') {
            return reject(new Error(`TallyClient Error: Empty response body received from ${this.host}:${this.port}`));
          }
          resolve(data);
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`TallyClient Error: Request timed out for ${this.host}:${this.port}`));
      });

      req.on('error', (err) => {
        let msg = `TallyClient Error: Failed to communicate with ${this.host}:${this.port}. `;
        if (err.code === 'ECONNREFUSED') {
          msg += 'Connection refused.';
        } else if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
          msg += 'DNS lookup failed.';
        } else {
          msg += err.message;
        }
        reject(new Error(msg));
      });

      req.write(xmlData);
      req.end();
    });
  }
}

module.exports = TallyClient;
