/**
 * Utility functions for generating consistent colors from usernames
 */

/**
 * Generate a consistent color from a username using hash function
 * @param username - The username to generate color for
 * @returns A hex color string (e.g., "#667eea")
 */
export const getUsernameColor = (username: string): string => {
  // Hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate color using HSL with good saturation and lightness
  // Using a range of hues (0-360) for variety
  const hue = Math.abs(hash) % 360;
  
  // Use consistent saturation (60-80%) and lightness (45-55%) for readability
  const saturation = 65 + (Math.abs(hash) % 15); // 65-80%
  const lightness = 48 + (Math.abs(hash) % 7); // 48-55%

  // Convert HSL to RGB then to hex
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h * 6 < 1) {
    r = c; g = x; b = 0;
  } else if (h * 6 < 2) {
    r = x; g = c; b = 0;
  } else if (h * 6 < 3) {
    r = 0; g = c; b = x;
  } else if (h * 6 < 4) {
    r = 0; g = x; b = c;
  } else if (h * 6 < 5) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
};

/**
 * Get a lighter version of the color for background
 * @param color - Hex color string
 * @returns Lighter hex color string
 */
export const getLighterColor = (color: string, alpha: number = 0.15): string => {
  // Extract RGB from hex
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

