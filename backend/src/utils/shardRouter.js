/**
 * Determines the shard for a given short code based on its first character.
 *
 * A–F → shard_1
 * G–M → shard_2
 * N–S → shard_3
 * T–Z and digits (0–9) → shard_4
 *
 * @param {string} shortCode
 * @returns {string} shard identifier
 */
function getShard(shortCode) {
  if (!shortCode || typeof shortCode !== 'string' || shortCode.length === 0) {
    return 'shard_4';
  }

  const first = shortCode[0].toUpperCase();

  if (first >= 'A' && first <= 'F') return 'shard_1';
  if (first >= 'G' && first <= 'M') return 'shard_2';
  if (first >= 'N' && first <= 'S') return 'shard_3';
  return 'shard_4'; // T–Z and digits 0–9
}

module.exports = { getShard };
