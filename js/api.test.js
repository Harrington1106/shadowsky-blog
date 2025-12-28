/**
 * API Module Tests
 * Tests for the unified API client module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// Import the module functions
const {
    validateApiResponse,
    createSuccessResponse,
    createErrorResponse,
    parseResponseText,
    ERROR_CODES
} = require('./api.js');

describe('API Module', () => {
    
    describe('validateApiResponse', () => {
        /**
         * **Feature: site-improvements, Property 10: API Response Format Validation**
         * *For any* API response, it SHALL have a boolean `success` field and either 
         * `data` (when success) or `error` (when failure).
         * **Validates: Requirements 10.1, 10.2**
         */
        it('Property 10: validates success responses have correct format', () => {
            fc.assert(
                fc.property(
                    fc.anything(),
                    (data) => {
                        const response = createSuccessResponse(data);
                        const result = validateApiResponse(response);
                        
                        // Success response must be valid
                        expect(result.valid).toBe(true);
                        // Must have boolean success field
                        expect(typeof response.success).toBe('boolean');
                        expect(response.success).toBe(true);
                        // Must have data field
                        expect('data' in response).toBe(true);
                        
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('Property 10: validates error responses have correct format', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1 }),
                    fc.string({ minLength: 1 }),
                    (code, message) => {
                        const response = createErrorResponse(code, message);
                        const result = validateApiResponse(response);
                        
                        // Error response must be valid
                        expect(result.valid).toBe(true);
                        // Must have boolean success field
                        expect(typeof response.success).toBe('boolean');
                        expect(response.success).toBe(false);
                        // Must have error object with code and message
                        expect(response.error).toBeDefined();
                        expect(typeof response.error.code).toBe('string');
                        expect(typeof response.error.message).toBe('string');
                        
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        it('rejects null/undefined responses', () => {
            expect(validateApiResponse(null).valid).toBe(false);
            expect(validateApiResponse(undefined).valid).toBe(false);
        });
        
        it('rejects non-object responses', () => {
            expect(validateApiResponse('string').valid).toBe(false);
            expect(validateApiResponse(123).valid).toBe(false);
            expect(validateApiResponse(true).valid).toBe(false);
        });
        
        it('rejects responses without success field', () => {
            expect(validateApiResponse({}).valid).toBe(false);
            expect(validateApiResponse({ data: {} }).valid).toBe(false);
        });
        
        it('rejects error responses without proper error object', () => {
            expect(validateApiResponse({ success: false }).valid).toBe(false);
            expect(validateApiResponse({ success: false, error: 'string' }).valid).toBe(false);
            expect(validateApiResponse({ success: false, error: {} }).valid).toBe(false);
            expect(validateApiResponse({ success: false, error: { code: 'ERR' } }).valid).toBe(false);
        });
    });
    
    describe('createSuccessResponse', () => {
        it('creates valid success response with data', () => {
            const data = { id: 1, name: 'test' };
            const response = createSuccessResponse(data);
            
            expect(response.success).toBe(true);
            expect(response.data).toEqual(data);
            expect(response.error).toBeUndefined();
        });
        
        it('creates valid success response with null data', () => {
            const response = createSuccessResponse(null);
            
            expect(response.success).toBe(true);
            expect(response.data).toBeNull();
        });
    });
    
    describe('createErrorResponse', () => {
        it('creates valid error response', () => {
            const response = createErrorResponse('NOT_FOUND', 'Resource not found');
            
            expect(response.success).toBe(false);
            expect(response.error.code).toBe('NOT_FOUND');
            expect(response.error.message).toBe('Resource not found');
            expect(response.data).toBeUndefined();
        });
    });
    
    describe('parseResponseText', () => {
        it('parses valid JSON', () => {
            const result = parseResponseText('{"success": true, "data": {"id": 1}}');
            
            expect(result.success).toBe(true);
            expect(result.data).toEqual({ success: true, data: { id: 1 } });
        });
        
        it('handles empty response', () => {
            expect(parseResponseText('').success).toBe(false);
            expect(parseResponseText('   ').success).toBe(false);
            expect(parseResponseText(null).success).toBe(false);
        });
        
        it('detects PHP source code', () => {
            const result = parseResponseText('<?php echo "error"; ?>');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('PHP');
        });
        
        it('detects HTML error pages', () => {
            const result = parseResponseText('<!DOCTYPE html><html><body>Error</body></html>');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('HTML');
        });
        
        it('handles invalid JSON', () => {
            const result = parseResponseText('not valid json');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('JSON parse error');
        });
    });
    
    describe('ERROR_CODES', () => {
        it('has all required error codes', () => {
            expect(ERROR_CODES.NETWORK_ERROR).toBeDefined();
            expect(ERROR_CODES.TIMEOUT_ERROR).toBeDefined();
            expect(ERROR_CODES.VALIDATION_ERROR).toBeDefined();
            expect(ERROR_CODES.NOT_FOUND).toBeDefined();
            expect(ERROR_CODES.DB_ERROR).toBeDefined();
            expect(ERROR_CODES.AUTH_ERROR).toBeDefined();
            expect(ERROR_CODES.RATE_LIMIT).toBeDefined();
            expect(ERROR_CODES.PARSE_ERROR).toBeDefined();
            expect(ERROR_CODES.UNKNOWN_ERROR).toBeDefined();
        });
    });
});
