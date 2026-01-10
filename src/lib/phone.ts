/**
 * Phone number utilities for normalizing and comparing phone numbers
 * across different formats (e.g., "5577991001658" vs "(77) 99100-1658")
 */

/**
 * Remove all non-digit characters from a phone number
 */
export const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Get the last N digits of a phone number (useful for matching)
 */
export const getPhoneSuffix = (phone: string, digits: number = 10): string => {
  const normalized = normalizePhone(phone);
  return normalized.slice(-digits);
};

/**
 * Compare two phone numbers, ignoring formatting and country code differences
 */
export const phonesMatch = (phone1: string, phone2: string): boolean => {
  const n1 = normalizePhone(phone1);
  const n2 = normalizePhone(phone2);
  
  // Direct match
  if (n1 === n2) return true;
  
  // Compare last 10 digits (ignores country code 55)
  if (n1.slice(-10) === n2.slice(-10)) return true;
  
  // Compare last 11 digits (includes area code with 9)
  if (n1.slice(-11) === n2.slice(-11)) return true;
  
  return false;
};

/**
 * Generate phone variations for database queries
 * Useful when searching for a phone number stored in different formats
 */
export const getPhoneVariations = (phone: string): string[] => {
  const normalized = normalizePhone(phone);
  const last10 = normalized.slice(-10);
  const last11 = normalized.slice(-11);
  
  return [
    normalized,
    last10,
    last11,
    `55${last10}`,
    `55${last11}`,
  ].filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates
};
