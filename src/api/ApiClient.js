const http = require("http");
const ApiError = require("../errors/ApiError");
const https = require("https");
const { URL } = require("url");

const MAX_RETRIES = 3;

const RETRY_DELAYS_MS = Object.freeze([1000, 2000, 4000]);

class ApiClient {
  /**
   * @param {Object} config
   * @param {string} config.apiUrl - The base URL of the API.
   * @param {string} config.apiKey - The API key for authentication.
   */
  constructor(config) {
    if (!config || !config.apiUrl || !config.apiKey) {
      throw new ApiError("ApiClient requires a config with apiUrl and apiKey");
    }
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.apiRequestTimeout;
  }

  /**
   * Uploads changed entities to the backend API.
   * @param {string} entityType - The type of entities being uploaded.
   * @param {Array} entities - The entities to upload.
   * @returns {Promise<Object>} The JSON response from the API.
   */
  async uploadEntities(entityType, entities) {
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        const response = await this._makeRequest(entityType, entities);
        return response;
      } catch (error) {
        if (this._shouldRetry(error) && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS_MS[attempt];
          await this._sleep(delay);
          attempt++;
        } else {
          throw error; // Throw if max retries exceeded or error is not retryable
        }
      }
    }
  }

  _makeRequest(entityType, entities) {
    return new Promise((resolve, reject) => {
      let parsedUrl;
      try {
        parsedUrl = new URL(this.apiUrl);
      } catch (e) {
        return reject(new ApiError(`Invalid API URL: ${this.apiUrl}`));
      }

      const client = parsedUrl.protocol === "https:" ? https : http;
      const payload = JSON.stringify(entities);

      let endpointPath = parsedUrl.pathname;
      if (endpointPath.endsWith("/")) endpointPath = endpointPath.slice(0, -1);

      if (entityType === "STOCK_GROUP") {
        endpointPath += "/api/sync/stock-groups";
      } else if (entityType === "UNIT") {
        endpointPath += "/api/sync/units";
      } else if (entityType === "STOCK_ITEM") {
        endpointPath += "/api/sync/products";
      }

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: endpointPath + parsedUrl.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: this.timeout,
      };

      console.log("===== API REQUEST =====");
      console.log("URL:", endpointPath);
      console.log("API Key:", this.apiKey);

      console.log("Headers:");
      console.log({
        "X-API-Key": this.apiKey,
      });

      const req = client.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          const status = res.statusCode;

          if (status >= 500 && status <= 599) {
            const err = new ApiError(
              `HTTP Error: ${status} Internal Server Error`,
            );
            err.status = status;
            err.type = "SERVER_ERROR";
            return reject(err);
          }

          if (status === 401 || status === 403) {
            const err = new ApiError(`Authentication failure: HTTP ${status}`);
            err.status = status;
            err.type = "AUTH_ERROR";
            return reject(err);
          }

          if (status === 400 || status === 404) {
            console.log("Response body:");
            console.log(data);

            const err = new ApiError(
              `HTTP Error: ${status} Client Error\n${data}`,
            );
            err.status = status;
            err.type = "CLIENT_ERROR";
            return reject(err);
          }

          if (status < 200 || status >= 300) {
            const err = new ApiError(`Invalid HTTP status: ${status}`);
            err.status = status;
            err.type = "INVALID_STATUS";
            return reject(err);
          }

          try {
            const parsedData = JSON.parse(data);
            if (
              typeof parsedData !== "object" ||
              parsedData === null ||
              Array.isArray(parsedData)
            ) {
              const err = new ApiError(
                "Invalid JSON response: expected an object",
              );
              err.type = "INVALID_JSON";
              return reject(err);
            }
            resolve(parsedData);
          } catch (e) {
            const err = new ApiError("Invalid JSON response", { cause: e });
            err.type = "INVALID_JSON";
            reject(err);
          }
        });
      });

      req.on("error", (e) => {
        const err = new ApiError(`Connection failure: ${e.message}`, {
          cause: e,
        });
        err.type = "NETWORK_ERROR";
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy();
        const err = new ApiError("Request timeout");
        err.type = "TIMEOUT";
        reject(err);
      });

      req.write(payload);
      req.end();
    });
  }

  _shouldRetry(error) {
    if (
      error.type === "NETWORK_ERROR" ||
      error.type === "TIMEOUT" ||
      error.type === "SERVER_ERROR"
    ) {
      return true;
    }
    return false;
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = ApiClient;
