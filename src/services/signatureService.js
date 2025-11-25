/**
 * Signature Service - Generates machine signature via WebSocket
 */

const WebSocket = require('ws');
require('dotenv').config();

class SignatureService {
    constructor() {
        this.socketUrl = process.env.SIGNATURE_SOCKET_URL || 'ws://127.0.0.1:7573';
        this.vendorId = process.env.SIGNATURE_VENDOR_ID ? parseInt(process.env.SIGNATURE_VENDOR_ID) : 2328;
        this.method = process.env.SIGNATURE_METHOD ? parseInt(process.env.SIGNATURE_METHOD) : 33;
    }

    /**
     * Generate machine signature
     * @returns {Promise<string>} - Machine signature
     */
    async getMachineSignature() {
        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(this.socketUrl);
                let isResolved = false;

                // Timeout after 5 seconds
                const timeout = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        ws.terminate();
                        reject(new Error('Signature generation timed out'));
                    }
                }, 5000);

                ws.on('open', () => {
                    const payload = {
                        method: this.method,
                        vendorId: this.vendorId
                    };
                    ws.send(JSON.stringify(payload));
                });

                ws.on('message', (data) => {
                    if (isResolved) return;

                    try {
                        const response = JSON.parse(data.toString());

                        console.log('Signature response:', response);
                        if (response.RESULT && response.DATA) {
                            const signatureItem = response.DATA.find(item => item.Key === 'machineSignature');
                            
                            if (signatureItem && signatureItem.Value) {
                                isResolved = true;
                                clearTimeout(timeout);
                                ws.close();
                                resolve(signatureItem.Value);
                            } else {
                                isResolved = true;
                                clearTimeout(timeout);
                                ws.close();
                                reject(new Error('Machine signature not found in response'));
                            }
                        } else {
                            isResolved = true;
                            clearTimeout(timeout);
                            ws.close();
                            reject(new Error('Invalid signature response format'));
                        }
                    } catch (error) {
                        isResolved = true;
                        clearTimeout(timeout);
                        ws.close();
                        reject(new Error(`Failed to parse signature response: ${error.message}`));
                    }
                });

                ws.on('error', (error) => {
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeout);
                        reject(new Error(`WebSocket error: ${error.message}`));
                    }
                });

            } catch (error) {
                reject(new Error(`Failed to initialize WebSocket: ${error.message}`));
            }
        });
    }
}

module.exports = new SignatureService();

