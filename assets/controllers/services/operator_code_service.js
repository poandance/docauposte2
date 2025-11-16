import { getSettingsData } from '../../js/server-variable';
import axios from 'axios';


/**
 * Operator Code Service - Provides methods for code generation, validation, and checking
 */
class OperatorCodeService {
    initialized = false;
    initPromise = null;
    #codeOpeRegex = /^\d{5}$/;
    #codeOpeMethodBool = false;




    /**
      * Start the initialization process
      * This should be called right after creating the service instance
      */
    init() {
        if (this.initPromise === null || this.initPromise === undefined) {
            this.initPromise = this.initialize();
        }
        return this.initPromise;
    }




    /**
     * Initialize the service with settings from the server
     * @private
     */
    async initialize() {
        try {
            const data = await getSettingsData();
            this.#codeOpeMethodBool = data.operatorCodeMethod;
            if (!this.#codeOpeMethodBool) {
                const regexPattern = data.operatorCodeRegex.replace(/^\/|\/$/g, '');
                this.#codeOpeRegex = new RegExp(regexPattern);
            }
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing OperatorCodeService:', error);
            // Fall back to defaults
            this.initialized = true; // Mark as initialized even with defaults
        }
    }




    /**
     * Ensure the service is initialized before using it
     */
    async ensureInitialized() {
        if (!this.initialized) {
            if (this.initPromise === null || this.initPromise === undefined) {
                this.initPromise = this.initialize();
            }
            await this.initPromise;
        }
    }




    /**
     * Generate a compliant operator code
     * @returns {Promise<string>} A 5-digit code
     */
    async #generateCode() {
        await this.ensureInitialized();

        try {
            // Generate a random integer between 1 and 999
            const code = Math.floor(1 + Math.random() * 999);

            // Sum the digits of the 'code' integer
            let sumOfDigits = code
                .toString()
                .split('')
                .reduce((sum, digit) => sum + Number(digit), 0);

            const sumOfDigitsString = sumOfDigits.toString();

            if (sumOfDigitsString.length < 2) {
                sumOfDigits = '0' + sumOfDigits;
            }

            // Combine the original code and the sum of its digits
            let newCode = code.toString() + sumOfDigits.toString();

            // Ensure 'newCode' has exactly 5 digits
            if (newCode.length < 5) {
                // Pad with leading zeros if less than 5 digits
                newCode = newCode.padStart(5, '0');
            } else if (newCode.length > 5) {
                // If more than 5 digits, use the last 5 digits
                newCode = newCode.slice(-5);
            }

            return Promise.resolve(newCode);

        } catch (error) {
            console.error('Error generating operator code:', error);
            return Promise.resolve(false);
        }
    }



    /**
     * Validate a code against the current regex pattern
     * @param {string} code - The code to validate
     * @returns {Promise<boolean>} Whether the code is valid
     */
    async validateCode(code) {
        await this.ensureInitialized();

        if (!code || typeof code !== 'string') {
            return Promise.resolve(false);
        }

        if (this.#codeOpeMethodBool) {
            return this.validateCodeArithmetic(code);
        }

        try {
            const result = this.#codeOpeRegex.test(code);
            return Promise.resolve(result);
        } catch (error) {
            console.error('Error validating operator code:', error);
            return Promise.resolve(false);
        }
    }




    /**
     * Validate code against the arithmetic method where sum of first 3 digits equals last 2 digits
     * @param {string} code - The code to validate
     * @returns {Promise<boolean>} Whether the code is valid
     */
    async validateCodeArithmetic(code) {
        try {
            if (!this.#codeOpeRegex.test(code)) {
                return Promise.resolve(false);
            }

            // Extract first 3 digits and calculate their sum
            const sumOfFirstThreeDigits = code
                .toString()
                .split('')
                .slice(0, 3)
                .reduce((sum, digit) => sum + Number(digit), 0);

            // Extract last 2 digits as a single number
            const valueOfLastTwoDigits = Number(code.toString().slice(3));

            // Check if the sum equals the last 2 digits
            const result = sumOfFirstThreeDigits === valueOfLastTwoDigits;
            return Promise.resolve(result);
        } catch (error) {
            console.error('Error validating operator code with arithmetic method:', error);
            return Promise.resolve(false);
        }
    }




    /**
     * Check if a code already exists in the database
     * @param {string} code - The code to check
     * @returns {Promise<boolean>} Whether the code exists
     */
    async checkIfCodeExists(code) {
        try {
            const response = await axios.post('/docauposte/operator/check-if-code-exist', { code: code });
            return response.data.found;
        } catch (error) {
            console.error('Error checking if operator code exists:', error);
            return false;
        }
    }



    /**
     * Generate a unique code that doesn't exist in the database
     * @returns {Promise<string>} A unique operator code
     */
    async generateUniqueCode() {
        await this.ensureInitialized();
        let code = await this.#generateCode();

        let exists = await this.checkIfCodeExists(code);

        // Keep generating until we find a code that doesn't exist
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loops

        while (exists && attempts < maxAttempts) {
            code = await this.#generateCode();

            exists = await this.checkIfCodeExists(code);

            attempts++;
        }

        return code;
    }

    /**
     * Validate a code and check if it exists
     * @param {string} code - The code to validate
     * @returns {Promise<Object>} Validation result with isValid and exists properties
     */
    async validateAndCheckCode(code) {

        const isValid = await this.validateCode(code);

        let exists = false;

        if (isValid) {
            exists = await this.checkIfCodeExists(code);
        }

        const result = { isValid, exists };
        return result;
    }



    /**
     * Get the current settings
     * @returns {Promise<Object>} Current settings
     */
    async getSettings() {
        await this.ensureInitialized();
        const settings = {
            regex: this.#codeOpeRegex,
            methodEnabled: this.#codeOpeMethodBool
        };

        return settings;
    }
}

// Create a singleton instance
const operatorCodeService = new OperatorCodeService();
// Initialize the service immediately
operatorCodeService.init().catch(error => {
});
// Export the singleton service for use in other controllers
export { operatorCodeService };