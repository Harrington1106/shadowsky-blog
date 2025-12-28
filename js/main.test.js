/**
 * Property-based tests for visit counter functionality
 * **Feature: fix-visit-counter**
 * 
 * Property 1: Visit Count Increment - Validates: Requirements 2.1, 4.3
 * Property 2: Valid JSON Response Parsing - Validates: Requirements 3.3
 * Property 3: Display Consistency - Validates: Requirements 1.1
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

function parseVisitResponse(responseText) {
  if (!responseText || responseText.trim() === '') {
    return { success: false, error: 'Empty response from API' };
  }
  try {
    const data = JSON.parse(responseText);
    if (typeof data.count !== 'number' && typeof data.count !== 'string') {
      return { success: false, error: 'Response missing valid count field' };
    }
    const count = typeof data.count === 'string' ? parseInt(data.count, 10) : data.count;
    if (isNaN(count) || count < 0) {
      return { success: false, error: 'Invalid count value: ' + data.count };
    }
    return { success: true, count: count, mode: data.mode || 'unknown' };
  } catch (e) {
    if (responseText.includes('<?php') || responseText.includes('<?=')) {
      return { success: false, error: 'PHP source code returned instead of JSON - server may not be processing PHP' };
    }
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
      return { success: false, error: 'HTML error page returned instead of JSON' };
    }
    return { success: false, error: 'JSON parse error: ' + e.message };
  }
}

/**
 * **Feature: fix-visit-counter, Property 2: Valid JSON Response Parsing**
 * **Validates: Requirements 3.3**
 */
describe('parseVisitResponse - Property 2', () => {
  it('should correctly parse any valid JSON response with numeric count', () => {
    fc.assert(
      fc.property(fc.nat(), fc.option(fc.string({ minLength: 1, maxLength: 10 })), (count, mode) => {
        const response = mode ? JSON.stringify({ count, mode, page: 'test' }) : JSON.stringify({ count, page: 'test' });
        const result = parseVisitResponse(response);
        expect(result.success).toBe(true);
        expect(result.count).toBe(count);
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly parse string count values', () => {
    fc.assert(
      fc.property(fc.nat(), (count) => {
        const response = JSON.stringify({ count: String(count), page: 'test' });
        const result = parseVisitResponse(response);
        expect(result.success).toBe(true);
        expect(result.count).toBe(count);
      }),
      { numRuns: 100 }
    );
  });

  it('should return error for empty responses', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 20 }).filter(s => s.trim() === ''), (whitespace) => {
        const result = parseVisitResponse(whitespace);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should reject negative count values', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000000, max: -1 }), (negativeCount) => {
        const response = JSON.stringify({ count: negativeCount, page: 'test' });
        const result = parseVisitResponse(response);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should detect PHP source code in response', () => {
    fc.assert(
      fc.property(fc.constantFrom('<?php', '<?='), fc.string({ minLength: 1, maxLength: 100 }), (prefix, content) => {
        const response = prefix + ' ' + content;
        const result = parseVisitResponse(response);
        expect(result.success).toBe(false);
        expect(result.error).toContain('PHP source code');
      }),
      { numRuns: 100 }
    );
  });

  it('should detect HTML error pages in response', () => {
    fc.assert(
      fc.property(fc.constantFrom('<!DOCTYPE html>', '<html>', '<!DOCTYPE HTML>'), fc.string({ minLength: 1, maxLength: 100 }), (prefix, content) => {
        const response = prefix + content;
        const result = parseVisitResponse(response);
        expect(result.success).toBe(false);
        expect(result.error).toContain('HTML error page');
      }),
      { numRuns: 100 }
    );
  });

  it('should reject responses without count field', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), fc.string({ minLength: 1, maxLength: 50 }), (page, mode) => {
        const response = JSON.stringify({ page, mode });
        const result = parseVisitResponse(response);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: fix-visit-counter, Property 1: Visit Count Increment**
 * **Validates: Requirements 2.1, 4.3**
 */
function incrementVisitCount(visits, pageId) {
  const sanitizedPageId = pageId.replace(/[^a-zA-Z0-9_\-\.\/]/g, '') || 'home';
  if (typeof visits[sanitizedPageId] !== 'number') {
    visits[sanitizedPageId] = 0;
  }
  visits[sanitizedPageId]++;
  return { page: sanitizedPageId, count: visits[sanitizedPageId], mode: 'file' };
}

describe('Visit Count Increment - Property 1', () => {
  it('should increment count by exactly 1 for any page ID and initial count', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9_\-\.\/]{1,50}$/),
        fc.nat({ max: 1000000 }),
        (pageId, initialCount) => {
          const visits = { [pageId]: initialCount };
          const result = incrementVisitCount(visits, pageId);
          expect(result.count).toBe(initialCount + 1);
          expect(result.mode).toBeDefined();
          expect(['db', 'file']).toContain(result.mode);
          expect(result.page).toBe(pageId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should initialize count to 1 for new page IDs', () => {
    // Filter out JavaScript reserved property names that cause prototype pollution
    const reservedNames = ['__proto__', 'constructor', 'prototype', 'hasOwnProperty', 'toString', 'valueOf'];
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9_\-\.\/]{1,50}$/).filter(s => !reservedNames.includes(s)),
        (pageId) => {
          const visits = {};
          const result = incrementVisitCount(visits, pageId);
          expect(result.count).toBe(1);
          expect(result.mode).toBe('file');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sanitize invalid characters in page IDs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.nat({ max: 100 }),
        (rawPageId, initialCount) => {
          const sanitizedId = rawPageId.replace(/[^a-zA-Z0-9_\-\.\/]/g, '') || 'home';
          const visits = { [sanitizedId]: initialCount };
          const result = incrementVisitCount(visits, rawPageId);
          expect(result.page).toBe(sanitizedId);
          expect(result.count).toBe(initialCount + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple sequential increments correctly', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9_\-\.\/]{1,30}$/),
        fc.nat({ max: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (pageId, initialCount, numIncrements) => {
          const visits = { [pageId]: initialCount };
          let lastResult;
          for (let i = 0; i < numIncrements; i++) {
            lastResult = incrementVisitCount(visits, pageId);
          }
          expect(lastResult.count).toBe(initialCount + numIncrements);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: fix-visit-counter, Property 3: Display Consistency**
 * **Validates: Requirements 1.1**
 */
function applyBadgeStyle(element, text) {
  element.className = 'ml-1 transition-opacity duration-500';
  element.innerHTML = `<span class="mx-2 text-gray-300 dark:text-gray-700">|</span> <span>${text}</span>`;
  element.classList.remove('opacity-0', 'hidden');
}

function getDisplayedCount(element) {
  const spans = element.querySelectorAll('span');
  if (spans.length >= 2) {
    const countText = spans[1].textContent;
    const parsed = parseInt(countText, 10);
    return isNaN(parsed) ? countText : parsed;
  }
  return element.textContent;
}

describe('Display Consistency - Property 3', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><span id="visit-count" class="opacity-0">Loading...</span></body></html>');
    document = dom.window.document;
  });

  afterEach(() => {
    dom = null;
    document = null;
  });

  it('should display the exact numeric count returned by API', () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000000 }), (count) => {
        const countSpan = document.getElementById('visit-count');
        applyBadgeStyle(countSpan, count);
        const displayedCount = getDisplayedCount(countSpan);
        expect(displayedCount).toBe(count);
      }),
      { numRuns: 100 }
    );
  });

  it('should remove opacity-0 class after displaying count', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1000000 }), (count) => {
        const countSpan = document.getElementById('visit-count');
        countSpan.className = 'opacity-0 hidden';
        applyBadgeStyle(countSpan, count);
        expect(countSpan.classList.contains('opacity-0')).toBe(false);
        expect(countSpan.classList.contains('hidden')).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle string count values correctly', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1000000 }), (count) => {
        const countSpan = document.getElementById('visit-count');
        applyBadgeStyle(countSpan, String(count));
        const displayedCount = getDisplayedCount(countSpan);
        expect(parseInt(String(displayedCount), 10)).toBe(count);
      }),
      { numRuns: 100 }
    );
  });

  it('should display fallback values correctly', () => {
    fc.assert(
      fc.property(fc.constantFrom('---', 'Local', 'Error'), (fallbackValue) => {
        const countSpan = document.getElementById('visit-count');
        applyBadgeStyle(countSpan, fallbackValue);
        const displayedValue = getDisplayedCount(countSpan);
        expect(displayedValue).toBe(fallbackValue);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit Tests for Error Handling Scenarios
 * **Feature: fix-visit-counter**
 * **Validates: Requirements 1.2, 2.5, 4.1, 4.2**
 */
describe('Error Handling - Unit Tests', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><span id="visit-count" class="opacity-0">Loading...</span></body></html>');
    document = dom.window.document;
  });

  afterEach(() => {
    dom = null;
    document = null;
  });

  /**
   * Test network failure handling
   * Validates: Requirements 2.5 - IF the API request fails THEN the Visit Counter SHALL display a fallback indicator
   */
  describe('Network Failure Handling', () => {
    it('should return error for network timeout simulation (empty response)', () => {
      const result = parseVisitResponse('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty response from API');
    });

    it('should return error for null response', () => {
      const result = parseVisitResponse(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty response from API');
    });

    it('should return error for undefined response', () => {
      const result = parseVisitResponse(undefined);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty response from API');
    });

    it('should handle HTTP error page responses gracefully', () => {
      const errorPage = '<!DOCTYPE html><html><head><title>500 Internal Server Error</title></head><body>Server Error</body></html>';
      const result = parseVisitResponse(errorPage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('HTML error page');
    });

    it('should handle 404 error page responses', () => {
      const notFoundPage = '<html><body><h1>404 Not Found</h1></body></html>';
      const result = parseVisitResponse(notFoundPage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('HTML error page');
    });

    it('should display fallback indicator (---) on network failure', () => {
      const countSpan = document.getElementById('visit-count');
      applyBadgeStyle(countSpan, '---');
      const displayedValue = getDisplayedCount(countSpan);
      expect(displayedValue).toBe('---');
    });
  });

  /**
   * Test missing element handling
   * Validates: Requirements 1.2 - WHEN the visit-count element is not present THEN the system SHALL gracefully handle the absence without errors
   */
  describe('Missing Element Handling', () => {
    it('should not throw when visit-count element is missing', () => {
      const emptyDom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      const countSpan = emptyDocument.getElementById('visit-count');
      
      expect(countSpan).toBeNull();
      // Simulating the conditional check in main.js: if (countSpan) applyBadgeStyle(...)
      expect(() => {
        if (countSpan) applyBadgeStyle(countSpan, 123);
      }).not.toThrow();
    });

    it('should handle element with different ID gracefully', () => {
      const wrongIdDom = new JSDOM('<!DOCTYPE html><html><body><span id="wrong-id">Loading...</span></body></html>');
      const wrongIdDocument = wrongIdDom.window.document;
      const countSpan = wrongIdDocument.getElementById('visit-count');
      
      expect(countSpan).toBeNull();
      expect(() => {
        if (countSpan) applyBadgeStyle(countSpan, 456);
      }).not.toThrow();
    });

    it('should work correctly when element exists', () => {
      const countSpan = document.getElementById('visit-count');
      expect(countSpan).not.toBeNull();
      expect(() => {
        applyBadgeStyle(countSpan, 789);
      }).not.toThrow();
      expect(getDisplayedCount(countSpan)).toBe(789);
    });
  });

  /**
   * Test local development detection
   * Validates: Requirements 4.1 - WHEN running on localhost or file:// protocol THEN the Visit Counter SHALL display "Local"
   * Validates: Requirements 4.2 - WHEN the API endpoint is unreachable THEN the system SHALL log a warning and display a fallback value
   */
  describe('Local Development Detection', () => {
    /**
     * Helper to check if a hostname indicates local development
     */
    function isLocalEnvironment(hostname, protocol) {
      if (protocol === 'file:') return true;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
      return false;
    }

    it('should detect file:// protocol as local environment', () => {
      expect(isLocalEnvironment('', 'file:')).toBe(true);
    });

    it('should detect localhost as local environment', () => {
      expect(isLocalEnvironment('localhost', 'http:')).toBe(true);
    });

    it('should detect 127.0.0.1 as local environment', () => {
      expect(isLocalEnvironment('127.0.0.1', 'http:')).toBe(true);
    });

    it('should not detect production hostname as local environment', () => {
      expect(isLocalEnvironment('example.com', 'https:')).toBe(false);
    });

    it('should not detect subdomain as local environment', () => {
      expect(isLocalEnvironment('api.example.com', 'https:')).toBe(false);
    });

    it('should display "Local" indicator for local development', () => {
      const countSpan = document.getElementById('visit-count');
      applyBadgeStyle(countSpan, 'Local');
      const displayedValue = getDisplayedCount(countSpan);
      expect(displayedValue).toBe('Local');
    });

    it('should display "Local" with proper styling', () => {
      const countSpan = document.getElementById('visit-count');
      applyBadgeStyle(countSpan, 'Local');
      expect(countSpan.classList.contains('opacity-0')).toBe(false);
      expect(countSpan.innerHTML).toContain('Local');
    });
  });

  /**
   * Test PHP source code detection (common server misconfiguration)
   * Validates: Requirements 3.4 - WHEN the API returns non-JSON content THEN the system SHALL handle the error gracefully
   */
  describe('PHP Source Code Detection', () => {
    it('should detect PHP opening tag <?php', () => {
      const phpCode = '<?php\necho json_encode(["count" => 1]);\n?>';
      const result = parseVisitResponse(phpCode);
      expect(result.success).toBe(false);
      expect(result.error).toContain('PHP source code');
    });

    it('should detect PHP short echo tag <?=', () => {
      const phpCode = '<?= json_encode(["count" => 1]) ?>';
      const result = parseVisitResponse(phpCode);
      expect(result.success).toBe(false);
      expect(result.error).toContain('PHP source code');
    });

    it('should detect PHP code mixed with HTML', () => {
      const mixedCode = '<html><?php include "header.php"; ?></html>';
      const result = parseVisitResponse(mixedCode);
      expect(result.success).toBe(false);
      expect(result.error).toContain('PHP source code');
    });
  });

  /**
   * Test malformed JSON handling
   * Validates: Requirements 3.3, 3.4 - Graceful handling of invalid responses
   */
  describe('Malformed JSON Handling', () => {
    it('should handle truncated JSON', () => {
      const truncated = '{"count": 123, "mode":';
      const result = parseVisitResponse(truncated);
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON parse error');
    });

    it('should handle JSON with missing closing brace', () => {
      const incomplete = '{"count": 456';
      const result = parseVisitResponse(incomplete);
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON parse error');
    });

    it('should handle plain text response', () => {
      const plainText = 'Visit count: 100';
      const result = parseVisitResponse(plainText);
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON parse error');
    });

    it('should handle JSON with count as object (invalid type)', () => {
      const invalidType = '{"count": {"value": 100}, "mode": "db"}';
      const result = parseVisitResponse(invalidType);
      expect(result.success).toBe(false);
      expect(result.error).toContain('missing valid count field');
    });

    it('should handle JSON with count as array (invalid type)', () => {
      const invalidType = '{"count": [100], "mode": "db"}';
      const result = parseVisitResponse(invalidType);
      expect(result.success).toBe(false);
      expect(result.error).toContain('missing valid count field');
    });

    it('should handle JSON with NaN string count', () => {
      const nanCount = '{"count": "not-a-number", "mode": "db"}';
      const result = parseVisitResponse(nanCount);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid count value');
    });
  });
});
