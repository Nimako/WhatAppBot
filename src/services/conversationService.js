/**
 * Conversation Service - Manages conversation flow and state machine
 */

const dbService = require('./dbService');
const ecgService = require('./ecgService');
const twilioService = require('./twilioService');
const MessageFormatter = require('../utils/messageFormatter');

class ConversationService {
    // Conversation states
    static STATES = {
        MENU: 'MENU',
        PREPAID_METER_INFO: 'PREPAID_METER_INFO',
        POSTPAID_METER_INFO: 'POSTPAID_METER_INFO',
        PREPAID_ENQUIRY: 'PREPAID_ENQUIRY',
        POSTPAID_ENQUIRY: 'POSTPAID_ENQUIRY',
        CONFIRM_CHARGE: 'CONFIRM_CHARGE'
    };

    // Field collection order for meter info
    static METER_INFO_FIELDS = [
        { key: 'phoneNumber', label: 'Phone Number', required: true },
        { key: 'meterNumber', label: 'Meter Number', required: true },
        { key: 'accountNumber', label: 'Account Number', required: false }
    ];

    /**
     * Process incoming message
     * @param {string} phoneNumber - User's phone number
     * @param {string} message - User's message
     * @returns {Promise<string>} - Response message
     */
    async processMessage(phoneNumber, message) {
        try {
            // Get or create session
            const session = await dbService.getOrCreateSession(phoneNumber);
            
            // Handle menu reset commands
            const upperMessage = message.trim().toUpperCase();
            if (upperMessage === 'MENU' || upperMessage === 'RESET') {
                await dbService.resetSession(session.id);
                return MessageFormatter.formatMenu();
            }

            // Route based on current state
            switch (session.currentState) {
                case ConversationService.STATES.MENU:
                    return await this.handleMenu(session, message);
                
                case ConversationService.STATES.PREPAID_METER_INFO:
                    return await this.handleMeterInfoCollection(session, message, 'PREPAID');
                
                case ConversationService.STATES.POSTPAID_METER_INFO:
                    return await this.handleMeterInfoCollection(session, message, 'POSTPAID');
                
                case ConversationService.STATES.PREPAID_ENQUIRY:
                case ConversationService.STATES.POSTPAID_ENQUIRY:
                    return await this.handleEnquiryProcessing(session, message);
                
                case ConversationService.STATES.CONFIRM_CHARGE:
                    return await this.handleChargeConfirmation(session, message);
                
                default:
                    await dbService.resetSession(session.id);
                    return MessageFormatter.formatMenu();
            }
        } catch (error) {
            console.error('Error processing message:', error);
            
            // Check if this is a database configuration error
            if (error.message && error.message.includes('DATABASE_URL')) {
                console.error('⚠️  Database configuration error detected. Please set DATABASE_URL in your .env file.');
                return MessageFormatter.formatError('Service is temporarily unavailable. Please contact support or try again later.');
            }
            
            // Check if this is a backend API configuration error
            if (error.message && error.message.includes('BACKEND_BASE_URL')) {
                console.error('⚠️  Backend API configuration error detected. Please set BACKEND_BASE_URL in your .env file.');
                return MessageFormatter.formatError('Service is temporarily unavailable. Please contact support or try again later.');
            }
            
            return MessageFormatter.formatError('An unexpected error occurred. Please try again.');
        }
    }

    /**
     * Handle menu selection
     * @param {object} session - User session
     * @param {string} message - User message
     * @returns {Promise<string>} - Response message
     */
    async handleMenu(session, message) {
        const choice = message.trim();
        
        switch (choice) {
            case '1':
                // Prepaid
                await dbService.updateSession(session.id, ConversationService.STATES.PREPAID_METER_INFO, {
                    meterType: 'Prepaid',
                    currentFieldIndex: 0
                });
                return MessageFormatter.formatMeterInfoPrompt(
                    ConversationService.METER_INFO_FIELDS[0].label,
                    !ConversationService.METER_INFO_FIELDS[0].required
                );
            
            case '2':
                // Postpaid
                await dbService.updateSession(session.id, ConversationService.STATES.POSTPAID_METER_INFO, {
                    meterType: 'Postpaid',
                    currentFieldIndex: 0
                });
                return MessageFormatter.formatMeterInfoPrompt(
                    ConversationService.METER_INFO_FIELDS[0].label,
                    !ConversationService.METER_INFO_FIELDS[0].required
                );
            
            case '3':
                // Charge Status (to be implemented)
                return `*Charge Status*

This feature is coming soon. Please select another option:
1️⃣ Prepaid
2️⃣ Postpaid`;
            
            default:
                return MessageFormatter.formatMenu();
        }
    }

    /**
     * Handle meter info collection step by step
     * @param {object} session - User session
     * @param {string} message - User message
     * @param {string} type - PREPAID or POSTPAID
     * @returns {Promise<string>} - Response message
     */
    async handleMeterInfoCollection(session, message, type) {
        const sessionData = session.sessionData || {};
        let currentFieldIndex = sessionData.currentFieldIndex || 0;
        
        // Handle SKIP for optional fields
        if (message.trim().toUpperCase() === 'SKIP' && !ConversationService.METER_INFO_FIELDS[currentFieldIndex].required) {
            currentFieldIndex++;
        } else {
            // Store the field value
            const field = ConversationService.METER_INFO_FIELDS[currentFieldIndex];
            sessionData[field.key] = message.trim();
            currentFieldIndex++;
        }

        // Check if all required fields are collected
        if (currentFieldIndex >= ConversationService.METER_INFO_FIELDS.length) {
            // All fields collected, proceed to API calls
            sessionData.currentFieldIndex = currentFieldIndex;
            await dbService.updateSession(session.id, 
                type === 'PREPAID' ? ConversationService.STATES.PREPAID_ENQUIRY : ConversationService.STATES.POSTPAID_ENQUIRY,
                sessionData
            );
            
            // Start processing enquiry asynchronously (don't await - return processing message immediately)
            this.processEnquiryAsync(session.phoneNumber, session.id, type);
            
            // Return processing message immediately
            return MessageFormatter.formatProcessing('Processing your request');
        } else {
            // Ask for next field
            sessionData.currentFieldIndex = currentFieldIndex;
            const nextField = ConversationService.METER_INFO_FIELDS[currentFieldIndex];
            await dbService.updateSession(session.id, 
                type === 'PREPAID' ? ConversationService.STATES.PREPAID_METER_INFO : ConversationService.STATES.POSTPAID_METER_INFO,
                sessionData
            );
            
            return MessageFormatter.formatMeterInfoPrompt(
                nextField.label,
                !nextField.required
            );
        }
    }

    /**
     * Process enquiry asynchronously (sends messages via Twilio REST API)
     * @param {string} phoneNumber - User's phone number
     * @param {string} sessionId - Session ID
     * @param {string} type - PREPAID or POSTPAID
     */
    async processEnquiryAsync(phoneNumber, sessionId, type) {
        try {
            const session = await dbService.getSessionById(sessionId);
            if (!session) {
                await twilioService.sendMessage(phoneNumber, MessageFormatter.formatError('Session not found'));
                return;
            }

            const sessionData = session.sessionData || {};
            
            // Determine meter type - use sessionData.meterType (set from menu selection: 'Prepaid' or 'Postpaid')
            // Fallback to converting type parameter if not set
            const meterType = sessionData.meterType || (type === 'PREPAID' ? 'Prepaid' : 'Postpaid');
            
            // Send message: Retrieving meter information
            await twilioService.sendMessage(phoneNumber, MessageFormatter.formatProcessing('Retrieving meter information'));
            
            // Call MeterInfo API
            let meterInfoResponse;
            try {
                meterInfoResponse = await ecgService.getMeterInfo({
                    phoneNumber: sessionData.phoneNumber,
                    meterNumber: sessionData.meterNumber,
                    accountNumber: sessionData.accountNumber,
                    meterType: meterType,
                    machineSignature: sessionData.machineSignature
                });
            } catch (error) {
                await dbService.resetSession(sessionId);
                
                if (error.type === 'timeout') {
                    await twilioService.sendMessage(phoneNumber, MessageFormatter.formatTimeoutError());
                } else if (error.type === 'connection') {
                    await twilioService.sendMessage(phoneNumber, MessageFormatter.formatConnectionError());
                } else {
                    await twilioService.sendMessage(phoneNumber, MessageFormatter.formatError('Failed to retrieve meter information. Please check your details and try again.'));
                }
                return;
            }

            if (!meterInfoResponse || !meterInfoResponse.payLoad) {
                await dbService.resetSession(sessionId);
                await twilioService.sendMessage(phoneNumber, MessageFormatter.formatError('Failed to retrieve meter information. Please check your details and try again.'));
                return;
            }

            const payload = meterInfoResponse.payLoad;
            
            // Store meter info in session
            sessionData.meterInfo = meterInfoResponse;
            
            // Send message: Processing account enquiry
            await twilioService.sendMessage(phoneNumber, MessageFormatter.formatProcessing('Processing account enquiry'));
            
            // Call Enquiry API
            // Use meterType from payload if available, otherwise use the one we set from menu selection
            const enquiryMeterType = payload.meterType || meterType;
            
            let enquiryResponse;
            try {
                enquiryResponse = await ecgService.enquiry({
                    asyncRequestId: payload.meterId || '',
                    referenceId: payload.meterNumber || '',
                    meterSerial: payload.meterNumber || '',
                    mobileNumber: sessionData.phoneNumber,
                    meterType: enquiryMeterType,
                    machineSignature: sessionData.machineSignature
                });
            } catch (error) {
                await dbService.resetSession(sessionId);
                
                if (error.type === 'timeout') {
                    await twilioService.sendMessage(phoneNumber, MessageFormatter.formatTimeoutError());
                } else if (error.type === 'connection') {
                    await twilioService.sendMessage(phoneNumber, MessageFormatter.formatConnectionError());
                } else {
                    await twilioService.sendMessage(phoneNumber, MessageFormatter.formatError('Failed to retrieve account enquiry. Please try again.'));
                }
                return;
            }

            if (!enquiryResponse || !enquiryResponse.data || enquiryResponse.data.length === 0) {
                await dbService.resetSession(sessionId);
                await twilioService.sendMessage(phoneNumber, MessageFormatter.formatError('Failed to retrieve account enquiry. Please try again.'));
                return;
            }

            // Store enquiry response
            sessionData.enquiryResponse = enquiryResponse;
            await dbService.updateSession(sessionId, ConversationService.STATES.CONFIRM_CHARGE, sessionData);

            // Send enquiry response
            await twilioService.sendMessage(phoneNumber, MessageFormatter.formatEnquiryResponse(enquiryResponse));
        } catch (error) {
            console.error('Error processing enquiry async:', error);
            await dbService.resetSession(sessionId);
            await twilioService.sendMessage(phoneNumber, MessageFormatter.formatError('An error occurred while processing your request. Please try again.'));
        }
    }

    /**
     * Handle enquiry processing state (fallback)
     * @param {object} session - User session
     * @param {string} message - User message
     * @returns {Promise<string>} - Response message
     */
    async handleEnquiryProcessing(session, message) {
        // If we're in enquiry processing, wait for it to complete
        // This is a fallback in case user sends a message while processing
        return MessageFormatter.formatProcessing('Your request is still being processed');
    }

    /**
     * Handle charge confirmation
     * @param {object} session - User session
     * @param {string} message - User message
     * @returns {Promise<string>} - Response message
     */
    async handleChargeConfirmation(session, message) {
        const upperMessage = message.trim().toUpperCase();
        
        if (upperMessage === 'YES' || upperMessage === 'Y' || upperMessage === 'CONFIRM') {
            // Charge endpoint will be implemented later
            await dbService.resetSession(session.id);
            return MessageFormatter.formatSuccess('Your charge request has been received. The charge endpoint will be implemented soon.');
        } else if (upperMessage === 'NO' || upperMessage === 'N' || upperMessage === 'CANCEL') {
            await dbService.resetSession(session.id);
            return MessageFormatter.formatCancellation();
        } else {
            return MessageFormatter.formatChargeConfirmation(session.sessionData.meterType || '');
        }
    }
}

module.exports = new ConversationService();

