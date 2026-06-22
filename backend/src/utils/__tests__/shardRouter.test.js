const fc = require('fast-check');
const { getShard } = require('../shardRouter');

describe('shardRouter', () => {
  // Boundary tests
  test('A–F maps to shard_1', () => {
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach((c) => {
      expect(getShard(c + 'XXXXX')).toBe('shard_1');
    });
  });

  test('G–M maps to shard_2', () => {
    ['G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach((c) => {
      expect(getShard(c + 'XXXXX')).toBe('shard_2');
    });
  });

  test('N–S maps to shard_3', () => {
    ['N', 'O', 'P', 'Q', 'R', 'S'].forEach((c) => {
      expect(getShard(c + 'XXXXX')).toBe('shard_3');
    });
  });

  test('T–Z and digits map to shard_4', () => {
    ['T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '5', '9'].forEach((c) => {
      expect(getShard(c + 'XXXXX')).toBe('shard_4');
    });
  });

  test('lowercase is treated same as uppercase', () => {
    expect(getShard('aXXXXX')).toBe('shard_1');
    expect(getShard('gXXXXX')).toBe('shard_2');
    expect(getShard('nXXXXX')).toBe('shard_3');
    expect(getShard('tXXXXX')).toBe('shard_4');
  });

  // Feature: url-shortener, Property 14: Shard router determinism and correctness
  test('P14: getShard is deterministic — same input always yields same output', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z0-9]{1,20}$/), (code) => {
        const shard1 = getShard(code);
        const shard2 = getShard(code);
        expect(shard1).toBe(shard2);
        expect(['shard_1', 'shard_2', 'shard_3', 'shard_4']).toContain(shard1);
      }),
      { numRuns: 100 }
    );
  });
});
