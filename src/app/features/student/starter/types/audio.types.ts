export type AudioSource = 'upload' | 'convert';

export interface AudioMetadata {
  duration: number; // Duration in seconds
  durationFormatted?: string; // e.g., "5:30"
  fileSize?: number;
  fileName?: string;
  bitrate?: number;
  sampleRate?: number;
}

export interface AudioFormState {
  source: AudioSource | null;
  title: string;
  description: string;
  
  // Upload audio
  file: File | null;
  fileName: string;
  fileSize: number;
  metadata: AudioMetadata | null;
  
  // Convert text lesson
  textSource: 'lesson' | 'custom';
  selectedTextLessonId: string | null;
  selectedTextLesson: any | null;
  
  // Generate from text
  textContent: string;
  voice: string; // TTS voice selection
  speed: number; // Speech speed (0.5 - 2.0)
  
  // Edit mode
  existingUrl?: string; // URL of existing audio when editing
}

export interface AudioUploadResponse {
  asset: {
    url: string;
    fileName: string;
    fileSize: number;
    duration?: number;
  };
}

export interface AudioGenerationRequest {
  text: string;
  voice?: string;
  speed?: number;
  model?: string; // 'gpt-4o-mini-tts'
}

export interface AudioGenerationResponse {
  audioUrl: string;
  duration: number;
  fileName: string;
  fileSize: number;
}
