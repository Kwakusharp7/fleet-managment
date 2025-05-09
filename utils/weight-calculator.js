/**
 * Truck Side Skid Weight Calculator
 * Simple utility to calculate skid weight based on dimensions
 */

// Default density of wood in lbs per cubic foot
const DEFAULT_DENSITY = 40;

/**
 * Calculate weight of a skid based on dimensions
 * @param {number} width - Width in feet
 * @param {number} length - Length in feet
 * @param {number} height - Height in feet (default: 0.5)
 * @param {number} density - Material density in lbs/ft³ (default: 40 - wood)
 * @return {number} - Weight in pounds, rounded to 2 decimal places
 */
function calculateSkidWeight(width, length, height = 0.5, density = DEFAULT_DENSITY) {
  if (!width || !length || width <= 0 || length <= 0) {
    throw new Error('Width and length must be positive numbers');
  }
  
  // Calculate volume in cubic feet
  const volume = width * length * height;
  
  // Calculate weight (volume × density)
  const weight = volume * density;
  
  // Round to 2 decimal places
  return Math.round(weight * 100) / 100;
}

// For browser use
if (typeof window !== 'undefined') {
  window.calculateSkidWeight = calculateSkidWeight;
}

// For Node.js use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateSkidWeight };
}