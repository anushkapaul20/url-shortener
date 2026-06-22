const RESERVED_KEYWORDS = new Set([
  'api', 'login', 'register', 'dashboard', 'profile', 'admin',
  'health', 'static', 'assets', 'favicon', 'create', 'analytics',
  'about', 'help', 'support', 'terms', 'privacy', 'contact',
  'home', 'index', 'app', 'www', 'mail', 'ftp',
]);

/**
 * Returns true if the alias is a reserved keyword.
 * @param {string} alias
 * @returns {boolean}
 */
function isReservedKeyword(alias) {
  return RESERVED_KEYWORDS.has(alias.toLowerCase());
}

module.exports = { isReservedKeyword, RESERVED_KEYWORDS };
