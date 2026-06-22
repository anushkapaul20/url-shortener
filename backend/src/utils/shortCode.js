const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CODE_LENGTH = 6;

/**
 * Generates a random 6-character Base62 short code.
 * @returns {string}
 */
function generateShortCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * BASE62.length);
    code += BASE62[idx];
  }
  return code;
}

module.exports = { generateShortCode, BASE62, CODE_LENGTH };
