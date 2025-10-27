/**
 * Utility functions for handling profile photos
 */

/**
 * Get the appropriate profile photo URL, using proxy for Google photos
 * @param photoUrl - The original photo URL
 * @returns The processed photo URL
 */
export function getProfilePhotoUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) {
    return null;
  }

  // If it's a Google profile photo, use our proxy
  if (photoUrl.includes('googleusercontent.com') || photoUrl.includes('googleapis.com')) {
    return `${photoUrl}`;
  }

  // For other URLs (S3, etc.), return as-is
  return photoUrl;
}

/**
 * Check if a photo URL is a Google profile photo
 * @param photoUrl - The photo URL to check
 * @returns True if it's a Google profile photo
 */
export function isGoogleProfilePhoto(photoUrl: string | null | undefined): boolean {
  if (!photoUrl) return false;
  return photoUrl.includes('googleusercontent.com') || photoUrl.includes('googleapis.com');
}
