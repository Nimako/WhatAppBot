/**
 * ECG Service for backend API integration
 * Handles authentication with Bearer token and automatic re-login on 401
 */

const axios = require('axios');
const signatureService = require('./signatureService');
require('dotenv').config();

class ECGService {
    constructor() {
        // Don't throw in constructor - allow lazy initialization
        this.baseUrl = process.env.BACKEND_BASE_URL;
        this.authToken = null;
        this.isLoggingIn = false;
    }

    /**
     * Ensure baseUrl is set before making API calls
     * @private
     */
    _ensureBaseUrl() {
        if (!this.baseUrl) {
            this.baseUrl = process.env.BACKEND_BASE_URL;
            if (!this.baseUrl) {
                throw new Error('BACKEND_BASE_URL environment variable is not set');
            }
        }
    }

    /**
     * Login to get authentication token
     * @returns {Promise<string>} - Auth token
     * @throws {Error} - Throws error if login fails
     */
    async login() {
        this._ensureBaseUrl();
        
        const phoneNumber = process.env.ECG_API_PHONE_NUMBER;
        const password = process.env.ECG_API_PASSWORD;

        if (!phoneNumber || !password) {
            throw new Error('ECG_API_PHONE_NUMBER and ECG_API_PASSWORD environment variables are required');
        }

        try {
            console.log('Attempting to login to ECG API...');
            
            const model = {
                mobileNumber: phoneNumber,
                password: password
            };

            const response = await axios.post(
                `${this.baseUrl}/api/Login/Authenticate`,
                model,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.status === 200 && response.data) {
                const { statusCode, message, token } = response.data;
                
                if (statusCode === 200 && token) {
                    this.authToken = token;
                    console.log('Successfully logged in to ECG API');
                    console.log('Token:', token);
                    return token;
                }
                
                throw new Error(message || 'Login failed - no token received');
            }

            throw new Error('Login failed - unexpected response');
        } catch (error) {
            console.error('Login error:', error.message);
            this.authToken = null;
            
            if (error.response) {
                const apiError = new Error(`Login failed: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
                apiError.type = 'auth';
                apiError.statusCode = error.response.status;
                throw apiError;
            }
            
            throw error;
        }
    }

    /**
     * Ensure we have a valid auth token
     * @private
     * @returns {Promise<string>} - Auth token
     */
    async _ensureAuth() {
        if (!this.authToken) {
            await this.login();
        }
        return this.authToken;
    }

    /**
     * Get authorization headers
     * @private
     * @returns {Promise<object>} - Headers object with Bearer token
     */
    async _getAuthHeaders() {
        const token = await this._ensureAuth();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    /**
     * Make an authenticated API request with automatic retry on 401
     * @private
     * @param {Function} requestFn - Function that makes the actual request
     * @param {boolean} isRetry - Whether this is a retry after re-login
     * @returns {Promise<object>} - API response data
     */
    async _makeAuthenticatedRequest(requestFn, isRetry = false) {
        try {
            const headers = await this._getAuthHeaders();
            return await requestFn(headers);
        } catch (error) {
            // If we get a 401 and haven't retried yet, re-login and retry
            if (error.response?.status === 401 && !isRetry) {
                console.log('Received 401 Unauthorized, attempting to re-login...');
                this.authToken = null; // Clear the token
                await this.login(); // Re-login
                return this._makeAuthenticatedRequest(requestFn, true); // Retry the request
            }
            throw error;
        }
    }

    /**
     * Format phone number (remove spaces, dashes, etc.)
     * @param {string} phoneNumber - Phone number to format
     * @returns {string} - Formatted phone number
     */
    formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) return '';
        // Remove all non-digit characters except +
        return phoneNumber.replace(/[^\d+]/g, '');
    }

    /**
     * Handle API errors consistently
     * @private
     * @param {Error} error - The error object
     * @param {string} context - Context message for the error
     * @throws {Error} - Processed error with type
     */
    _handleError(error, context) {
        console.error(`Error ${context}:`, error.message);
        
        // Handle timeout
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            const timeoutError = new Error('Request timeout - service took too long to respond');
            timeoutError.type = 'timeout';
            throw timeoutError;
        }
        
        // Handle connection errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            const connError = new Error('Unable to connect to service');
            connError.type = 'connection';
            throw connError;
        }
        
        // Handle network errors
        if (!error.response) {
            const networkError = new Error('Network error - unable to reach service');
            networkError.type = 'connection';
            throw networkError;
        }
        
        // Handle API errors
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
            const apiError = new Error(`API error: ${error.response.status} - ${error.response.statusText || 'Unknown error'}`);
            apiError.type = 'api';
            apiError.statusCode = error.response.status;
            throw apiError;
        }
        
        // Re-throw if already processed
        if (error.type) {
            throw error;
        }
        
        // Generic error
        const genericError = new Error(`An unexpected error occurred while ${context}`);
        genericError.type = 'api';
        throw genericError;
    }

    /**
     * Get meter information
     * @param {object} params - Meter info parameters
     * @param {string} params.phoneNumber - Phone number
     * @param {string} params.meterNumber - Meter number
     * @param {string} params.accountNumber - Account number (optional)
     * @param {string} params.meterType - Meter type (optional)
     * @param {string} params.machineSignature - Machine signature (optional)
     * @returns {Promise<object>} - Meter info response
     * @throws {Error} - Throws error with type 'timeout', 'connection', or 'api' for proper handling
     */
    async getMeterInfo({ phoneNumber, meterNumber, accountNumber, meterType, machineSignature }) {
        this._ensureBaseUrl();
        
        const model = {
            phoneNumber: phoneNumber ? this.formatPhoneNumber(phoneNumber) : '',
            meterNumber: meterNumber || '',
            accountNumber: accountNumber || '',
            meterType: meterType || ''
        };

        try {
            const response = await this._makeAuthenticatedRequest(async (headers) => {
                return axios.post(
                    `${this.baseUrl}/api/Power/OnlineInfo`,
                    model,
                    {
                        headers,
                        timeout: 30000
                    }
                );
            });

            if (response.status === 200 && response.data) {
                console.log('Meter information:', response.data);
                return response.data;
            }

            const error = new Error('Failed to retrieve meter information');
            error.type = 'api';
            error.statusCode = response.status;
            throw error;
        } catch (error) {
            this._handleError(error, 'getting meter info');
        }
    }

    /**
     * Enquiry for prepaid/postpaid
     * @param {object} params - Enquiry parameters
     * @param {string} params.asyncRequestId - Async request ID
     * @param {string} params.referenceId - Reference ID
     * @param {string} params.meterSerial - Meter serial number
     * @param {string} params.mobileNumber - Mobile number
     * @param {string} params.meterType - Meter type
     * @param {string} params.machineSignature - Machine signature (optional)
     * @returns {Promise<object>} - Enquiry response
     * @throws {Error} - Throws error with type 'timeout', 'connection', or 'api' for proper handling
     */
    async enquiry({ asyncRequestId, referenceId, meterSerial, mobileNumber, meterType, machineSignature }) {
        this._ensureBaseUrl();
        
        // Generate machine signature if not provided
        let signature = machineSignature;
        if (!signature) {
            try {
                signature = await signatureService.getMachineSignature();
                console.log('Machine signature:', signature);
            } catch (sigError) {
                console.error('Failed to generate machine signature:', sigError.message);
            }
        }

        const model = {
            asyncRequestId: asyncRequestId || '',
            referenceId: referenceId || '',
            meterSerial: meterSerial || '',
            mobileNumber: mobileNumber || '',
            meterType: meterType || '',
            machineSignature: signature || ''
        };

        try {
            const response = await this._makeAuthenticatedRequest(async (headers) => {
                return axios.post(
                    `${this.baseUrl}/api/Power/OnlineEnquiry`,
                    model,
                    {
                        headers,
                        timeout: 30000
                    }
                );
            });

            if (response.status === 200 && response.data) {
                console.log('Account enquiry:', response.data);
                return response.data;
            }

            const error = new Error('Failed to retrieve account enquiry');
            error.type = 'api';
            error.statusCode = response.status;
            throw error;
        } catch (error) {
            this._handleError(error, 'processing enquiry');
        }
    }

    /**
     * Clear the current auth token (useful for testing or forced re-login)
     */
    clearToken() {
        this.authToken = null;
        console.log('Auth token cleared');
    }

    /**
     * Check if currently authenticated
     * @returns {boolean} - Whether we have an auth token
     */
    isAuthenticated() {
        return !!this.authToken;
    }
}

module.exports = new ECGService();
