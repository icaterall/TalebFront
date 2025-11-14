export type VideoSource = 'local' | 'youtube';

export interface VideoMetadata {
  duration: number; // Duration in seconds
  durationFormatted?: string; // e.g., "5:30"
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  duration: number; // in seconds
  thumbnail: string;
  embedUrl: string;
}

export interface VideoFormState {
  source: VideoSource | null;
  title: string;
  description: string;
  
  // For local upload
  file: File | null;
  fileName?: string;
  fileSize?: number;
  dataUrl?: string | null;
  
  // For YouTube
  youtubeUrl: string;
  youtubeData?: YouTubeVideoData | null;
  
  // Common metadata
  metadata?: VideoMetadata;
}

export interface VideoDetails {
  source: VideoSource;
  title: string;
  description: string;
  
  // Local video details
  fileName?: string;
  fileSize?: number;
  dataUrl?: string;
  
  // YouTube details
  youtubeUrl?: string;
  youtubeVideoId?: string;
  youtubeEmbedUrl?: string;
  
  // Common metadata
  duration?: number;
  durationFormatted?: string;
  thumbnail?: string;
}
