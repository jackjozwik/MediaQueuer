/**
 * Converts a string to title case (first letter of each word capitalized)
 */
export function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Capitalizes the first letter of each sentence in a string
 */
export function capitalizeSentences(str) {
  if (!str) return '';
  // Regex to match the start of each sentence
  return str.replace(/(^\s*|[.!?]\s+)([a-z])/g, function(match, p1, p2) {
    return p1 + p2.toUpperCase();
  });
}

/**
 * Capitalizes names in a string
 */
export function capitalizeNames(str) {
  if (!str) return '';
  return str.split(' ').map(word => {
    if (word.length > 0) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');
} 