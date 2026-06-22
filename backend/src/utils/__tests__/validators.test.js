const fc = require('fast-check');
const { isValidEmail, isValidUrl } = require('../validators');

describe('validators', () => {
  // Email examples
  test('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('hello+tag@sub.domain.org')).toBe(true);
  });

  test('rejects invalid emails', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  // URL examples
  test('accepts valid http/https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://sub.example.com/path?q=1')).toBe(true);
  });

  test('rejects invalid URLs', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('notaurl')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('http://')).toBe(false);
  });

  // Feature: url-shortener, Property 1: Email validation correctness
  test('P1: validates arbitrary strings consistently', () => {
    const validEmails = ['a@b.co', 'test@example.com', 'x.y+z@domain.org'];
    const invalidEmails = ['notanemail', 'missing@', '@no-local.com', '', '   '];

    validEmails.forEach((email) => {
      expect(isValidEmail(email)).toBe(true);
    });
    invalidEmails.forEach((email) => {
      expect(isValidEmail(email)).toBe(false);
    });

    fc.assert(
      fc.property(fc.string(), (str) => {
        const result = isValidEmail(str);
        expect(typeof result).toBe('boolean');
      }),
      { numRuns: 100 }
    );
  });

  // Feature: url-shortener, Property 7: URL format validation correctness
  test('P7: validates URLs consistently for arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const result = isValidUrl(str);
        expect(typeof result).toBe('boolean');
        // Strings without http:// or https:// prefix must be rejected
        if (!str.startsWith('http://') && !str.startsWith('https://')) {
          expect(result).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});
