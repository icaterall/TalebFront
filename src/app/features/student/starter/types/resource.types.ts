export type ResourceDisplayType = 'pdf' | 'word' | 'excel' | 'ppt' | 'compressed';

export type ResourcePreviewMode = 'inline' | 'download';

export interface ResourceFormState {
  title: string;
  description: string;
  displayType: ResourceDisplayType;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string | null;
  previewMode: ResourcePreviewMode;
  pageCount: number | null;
}

export interface ResourceTypeOption {
  value: ResourceDisplayType;
  icon: string;
  labelEn: string;
  labelAr: string;
  previewable: boolean;
  extensions: string[];
}
