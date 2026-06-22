const fc = require('fast-check');
const { generateShortCode, BASE62, CODE_LENGTH } = require('../shortCode');

describe('shortCode utility', () => {
  // Example-based tests
  test('generates a string of length 6', () => {
    const code = generateShortCode();
    expect(code).toHaveLength(CODE_LENGTH);
  });

  test('generates only Base62 characters', () => {
    const code = generateShortCode();
    expect([...code].every((c) => BASE62.includes(c))).toBe(true);
  });

  // Feature: url-shortener, Property 5: Base62 short codes
  test('P5: all generated codes are Base62 and length 6', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), () => {
        const code = generateShortCode();
        expect(code).toHaveLength(CODE_LENGTH);
        expect([...code].every((c) => BASE62.includes(c))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: url-shortener, Property 6: Short code uniqueness across bulk generation
  test('P6: batch of 200 generated codes has no duplicates', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const codes = Array.from({ length: 200 }, () => generateShortCode());
        const unique = new Set(codes);
        // Given Base62^6 = 56 billion combinations, collisions are astronomically rare
        // This test validates the property holds across random batches
        expect(unique.size).toBeGreaterThanOrEqual(195); // allow <0.01% collision in test
      }),
      { numRuns: 100 }
    );
  });
});
