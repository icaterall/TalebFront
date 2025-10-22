/**
 * Utility functions for generating user initials for avatar display
 */

/**
 * Check if text contains Arabic characters
 */
export function hasArabicCharacters(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Generate user initials from name
 * For Arabic names, adds space between initials to prevent letter connection
 * 
 * @param name - User's full name
 * @param maxInitials - Maximum number of initials (default: 2)
 * @returns Initials string (e.g., "JD" for "John Doe" or "أ م" for "أحمد محمد")
 * 
 * @example
 * getUserInitials("John Doe")       // Returns: "JD"
 * getUserInitials("أحمد محمد")       // Returns: "أ م" (with space)
 * getUserInitials("Single")         // Returns: "S"
 * getUserInitials("")               // Returns: ""
 */
export function getUserInitials(name: string, maxInitials: number = 2): string {
  if (!name) return '';
  
  const trimmedName = name.trim();
  if (!trimmedName) return '';
  
  // Split name into parts (by spaces)
  const parts = trimmedName.split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) return '';
  
  // Get first and last initials
  const first = parts[0]?.[0] || '';
  const last = (parts.length > 1 ? parts[parts.length - 1][0] : '') || '';
  
  // Combine initials
  let initials = '';
  if (first && last) {
    initials = first + last;
  } else if (first) {
    initials = first;
  }
  
  // For Arabic text, add space between letters to prevent connection
  const isArabic = hasArabicCharacters(initials);
  
  if (isArabic && first && last) {
    // Add space to prevent Arabic letter ligatures
    return (first + ' ' + last).toUpperCase();
  }
  
  return initials.toUpperCase();
}

/**
 * Get avatar background color based on user name
 * Returns consistent color for the same name
 * 
 * @param name - User's name
 * @returns CSS color string
 */
export function getAvatarColor(name: string): string {
  if (!name) return '#e11d48'; // Default red
  
  const colors = [
    '#e11d48', // Red
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Orange
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#6366f1', // Indigo
  ];
  
  // Generate consistent color based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Format user display name
 * 
 * @param user - User object with name field
 * @returns Display name
 */
export function getUserDisplayName(
  user: { name?: string; email?: string }
): string {
  return user.name || user.email || '';
}

