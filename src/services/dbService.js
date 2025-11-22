/**
 * Database service for managing user sessions
 */

const { Pool } = require('pg');
const Session = require('../models/session');
require('dotenv').config();

class DbService {
    constructor() {
        this.pool = null;
        this._initializePool();
    }

    /**
     * Initialize database connection pool
     * @private
     */
    _initializePool() {
        const connectionString = process.env.DATABASE_URL;
        
        if (!connectionString) {
            console.warn('⚠️  Warning: DATABASE_URL environment variable is not set. Database operations will fail.');
            return;
        }

        try {
            this.pool = new Pool({
                connectionString: connectionString,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            });

            // Test connection
            this.pool.on('error', (err) => {
                console.error('Unexpected error on idle client', err);
            });
        } catch (error) {
            console.error('Error initializing database pool:', error.message);
            this.pool = null;
        }
    }

    /**
     * Ensure database pool is initialized
     * @private
     * @throws {Error} If DATABASE_URL is not set
     */
    _ensurePool() {
        if (!this.pool) {
            if (!process.env.DATABASE_URL) {
                throw new Error('DATABASE_URL environment variable is not set. Please configure your database connection.');
            }
            this._initializePool();
            if (!this.pool) {
                throw new Error('Failed to initialize database connection pool.');
            }
        }
    }

    /**
     * Get or create a user session
     * @param {string} phoneNumber - User's phone number
     * @returns {Promise<Session>} - User session
     */
    async getOrCreateSession(phoneNumber) {
        this._ensurePool();
        try {
            // Try to get existing session
            const result = await this.pool.query(
                'SELECT * FROM user_sessions WHERE phone_number = $1 ORDER BY updated_at DESC LIMIT 1',
                [phoneNumber]
            );

            if (result.rows.length > 0) {
                return new Session(result.rows[0]);
            }

            // Create new session
            const insertResult = await this.pool.query(
                `INSERT INTO user_sessions (phone_number, current_state, session_data)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [phoneNumber, 'MENU', '{}']
            );

            return new Session(insertResult.rows[0]);
        } catch (error) {
            console.error('Error getting or creating session:', error);
            throw error;
        }
    }

    /**
     * Update session state and data
     * @param {string} sessionId - Session ID
     * @param {string} state - New state
     * @param {object} sessionData - Session data to merge
     * @returns {Promise<Session>} - Updated session
     */
    async updateSession(sessionId, state, sessionData = null) {
        this._ensurePool();
        try {
            let query;
            let params;

            if (sessionData !== null) {
                // Merge session data
                query = `
                    UPDATE user_sessions
                    SET current_state = $1,
                        session_data = session_data || $2::jsonb
                    WHERE id = $3
                    RETURNING *
                `;
                params = [state, JSON.stringify(sessionData), sessionId];
            } else {
                // Only update state
                query = `
                    UPDATE user_sessions
                    SET current_state = $1
                    WHERE id = $2
                    RETURNING *
                `;
                params = [state, sessionId];
            }

            const result = await this.pool.query(query, params);
            
            if (result.rows.length === 0) {
                throw new Error('Session not found');
            }

            return new Session(result.rows[0]);
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    }

    /**
     * Get session by ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<Session|null>} - Session or null if not found
     */
    async getSessionById(sessionId) {
        this._ensurePool();
        try {
            const result = await this.pool.query(
                'SELECT * FROM user_sessions WHERE id = $1',
                [sessionId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return new Session(result.rows[0]);
        } catch (error) {
            console.error('Error getting session by ID:', error);
            throw error;
        }
    }

    /**
     * Clear session data (reset to menu)
     * @param {string} sessionId - Session ID
     * @returns {Promise<Session|null>} - Updated session or null if not found
     */
    async resetSession(sessionId) {
        this._ensurePool();
        try {
            const result = await this.pool.query(
                `UPDATE user_sessions
                 SET current_state = $1, session_data = '{}'::jsonb
                 WHERE id = $2
                 RETURNING *`,
                ['MENU', sessionId]
            );

            if (result.rows.length === 0) {
                // Session doesn't exist (may have been deleted)
                return null;
            }

            return new Session(result.rows[0]);
        } catch (error) {
            console.error('Error resetting session:', error);
            return null;
        }
    }

    /**
     * Delete a session completely
     * @param {string} sessionId - Session ID
     * @returns {Promise<void>}
     */
    async deleteSession(sessionId) {
        this._ensurePool();
        try {
            await this.pool.query(
                'DELETE FROM user_sessions WHERE id = $1',
                [sessionId]
            );
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    }

    /**
     * Close database connection pool
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
}

module.exports = new DbService();

