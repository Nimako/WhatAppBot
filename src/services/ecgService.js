/**
 * ECG Service for backend API integration
 */

const axios = require('axios');
const signatureService = require('./signatureService');
require('dotenv').config();

class ECGService {
    constructor() {
        // Don't throw in constructor - allow lazy initialization
        this.baseUrl = process.env.BACKEND_BASE_URL;
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
    async   ({ phoneNumber, meterNumber, accountNumber, meterType, machineSignature }) {
        this._ensureBaseUrl();
        try {
            const model = {
                phoneNumber: phoneNumber ? this.formatPhoneNumber(phoneNumber) : '',
                meterNumber: meterNumber || '',
                accountNumber: accountNumber || '',
                meterType: meterType || ''
            };

            const response = await axios.post(
                `${this.baseUrl}/api/Power/OnlineInfo`,
                model,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 seconds timeout
                }
            );

            if (response.status === 200 && response.data) {
                return response.data;
            }

            const error = new Error('Failed to retrieve meter information');
            error.type = 'api';
            error.statusCode = response.status;
            throw error;
        } catch (error) {
            console.error('Error getting meter info:', error.message);
            
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
            const genericError = new Error('An unexpected error occurred while retrieving meter information');
            genericError.type = 'api';
            throw genericError;
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
        try {
            // Generate machine signature if not provided
            let signature = machineSignature;
            if (!signature) {
                try {
                    signature = await signatureService.getMachineSignature();
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

            const response = await axios.post(
                `${this.baseUrl}/api/Power/OnlineEnquiry`,
                model,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 seconds timeout
                }
            );

            if (response.status === 200 && response.data) {
                return response.data;
            }

            const error = new Error('Failed to retrieve account enquiry');
            error.type = 'api';
            error.statusCode = response.status;
            throw error;
        } catch (error) {
            console.error('Error in enquiry:', error.message);
            
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
            const genericError = new Error('An unexpected error occurred while processing enquiry');
            genericError.type = 'api';
            throw genericError;
        }
    }
}

module.exports = new ECGService();

