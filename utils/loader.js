const fs = require('fs');
const path = require('path');

/**
 * Recursively loads .js files from a given directory.
 * @param {string} dir - Base directory to search.
 * @param {(filename: string) => boolean} filter - Optional filter function.
 * @returns {string[]} Array of absolute file paths.
 */
function loadFiles(dir, filter = f => f.endsWith('.js')) {
  const results = [];

  const read = folder => {
    const entries = fs.readdirSync(folder, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        read(fullPath);
      } else if (filter(entry.name)) {
        results.push(fullPath);
      }
    }
  };

  read(dir);
  return results;
}

module.exports = { loadFiles };
