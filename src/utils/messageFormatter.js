/**
 * Message formatting utilities for WhatsApp messages
 */

class MessageFormatter {
    /**
     * Format main menu message
     * @returns {string} - Formatted menu message
     */
    static formatMenu() {
        return `*ECG Credit Purchase Bot*

Please select an option:
1️⃣ Prepaid
2️⃣ Postpaid
3️⃣ Charge Status

Reply with the number of your choice.`;
    }

    /**
     * Format error message
     * @param {string} message - Error message
     * @returns {string} - Formatted error message
     */
    static formatError(message = 'An error occurred. Please try again.') {
        return `❌ *Error*
${message}

Type *MENU* to return to the main menu.`;
    }

    /**
     * Format enquiry response data
     * @param {object} enquiryData - Enquiry response data
     * @returns {string} - Formatted enquiry message
     */
    static formatEnquiryResponse(enquiryData) {
        if (!enquiryData || !enquiryData.data || enquiryData.data.length === 0) {
            return `❌ No enquiry data found. Please try again.`;
        }

        const datum = enquiryData.data[0];
        let message = `*Account Enquiry Results*\n\n`;

        if (datum.customerName) {
            message += `👤 *Customer Name:* ${datum.customerName}\n`;
        }
        if (datum.accountNumber) {
            message += `🔢 *Account Number:* ${datum.accountNumber}\n`;
        }
        if (datum.address) {
            message += `📍 *Address:* ${datum.address}\n`;
        }
        if (datum.meterSerial) {
            message += `⚡ *Meter Serial:* ${datum.meterSerial}\n`;
        }
        if (datum.balance) {
            message += `💰 *Balance:* ${datum.balance}\n`;
        }
        if (datum.meterType) {
            message += `🔌 *Meter Type:* ${datum.meterType}\n`;
        }
        if (datum.meterCategory) {
            message += `📋 *Category:* ${datum.meterCategory}\n`;
        }
        if (datum.region) {
            message += `🌍 *Region:* ${datum.region}\n`;
        }
        if (datum.district) {
            message += `🏘️ *District:* ${datum.district}\n`;
        }
        if (datum.payMinAmount) {
            message += `💵 *Minimum Amount:* ${datum.payMinAmount}\n`;
        }

        message += `\nWould you like to proceed with charging? Reply *YES* to confirm or *NO* to cancel.`;

        return message;
    }

    /**
     * Format meter info request prompt
     * @param {string} field - Field name being requested
     * @param {boolean} isOptional - Whether the field is optional
     * @returns {string} - Formatted prompt message
     */
    static formatMeterInfoPrompt(field, isOptional = false) {
        const optionalText = isOptional ? ' (or type SKIP to skip)' : '';
        return `Please provide your *${field}*${optionalText}:`;
    }

    /**
     * Format confirmation message
     * @param {string} meterType - Prepaid or Postpaid
     * @returns {string} - Formatted confirmation message
     */
    static formatChargeConfirmation(meterType) {
        return `*Confirm ${meterType} Charge*

Please confirm to proceed with the charge. Reply *YES* to confirm or *NO* to cancel.

*Note:* The charge endpoint will be implemented soon.`;
    }

    /**
     * Format success message
     * @param {string} message - Success message
     * @returns {string} - Formatted success message
     */
    static formatSuccess(message) {
        return `✅ *Success*
${message}`;
    }

    /**
     * Format cancellation message
     * @returns {string} - Formatted cancellation message
     */
    static formatCancellation() {
        return `❌ Transaction cancelled.

Type *MENU* to return to the main menu.`;
    }

    /**
     * Format processing message
     * @param {string} action - Action being performed
     * @returns {string} - Formatted processing message
     */
    static formatProcessing(action = 'Processing your request') {
        return `⏳ *${action}*

Please wait while we process your request. This may take a few moments...`;
    }

    /**
     * Format timeout error message
     * @returns {string} - Formatted timeout error message
     */
    static formatTimeoutError() {
        return `⏱️ *Request Timeout*

The service is taking longer than expected to respond. This could be due to:
• High server load
• Network connectivity issues
• Service temporarily unavailable

Please try again in a few moments. Type *MENU* to return to the main menu.`;
    }

    /**
     * Format connection error message
     * @returns {string} - Formatted connection error message
     */
    static formatConnectionError() {
        return `🔌 *Connection Error*

We're unable to reach the service at this time. This could be due to:
• Network connectivity issues
• Service maintenance
• Temporary service outage

Please try again later. Type *MENU* to return to the main menu.`;
    }
}

module.exports = MessageFormatter;

