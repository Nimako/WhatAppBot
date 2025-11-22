/**
 * Session model for user conversation state management
 */

class Session {
    constructor(data) {
        this.id = data.id;
        this.phoneNumber = data.phone_number;
        this.currentState = data.current_state;
        this.sessionData = data.session_data || {};
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    toJSON() {
        return {
            id: this.id,
            phoneNumber: this.phoneNumber,
            currentState: this.currentState,
            sessionData: this.sessionData,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Session;

