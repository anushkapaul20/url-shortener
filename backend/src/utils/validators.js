const validatorLib = require('validator');

/**
 * Validates an email address.
 * @param {string} str
 * @returns {boolean}
 */
function isValidEmail(str) {
  if (typeof str !== 'string') return false;
  return validatorLib.isEmail(str);
}

/**
 * Validates a URL — must have http:// or https:// scheme and a valid host.
 * @param {string} str
 * @returns {boolean}
 */
function isValidUrl(str) {
  if (typeof str !== 'string') return false;
  return validatorLib.isURL(str, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    require_host: true,
  });
}

module.exports = { isValidEmail, isValidUrl };
