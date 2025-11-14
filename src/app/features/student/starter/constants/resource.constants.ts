import { ResourceTypeOption } from '../types/resource.types';

export const RESOURCE_MAX_SIZE = 100 * 1024 * 1024; // 100MB
export const RESOURCE_INLINE_PREVIEW_LIMIT = 5 * 1024 * 1024; // 5MB for inline previews

export const RESOURCE_TYPE_OPTIONS: ResourceTypeOption[] = [
  { 
    value: 'compressed', 
    icon: '🗜️', 
    labelEn: 'Archive (ZIP/RAR)', 
    labelAr: 'ملف مضغوط (ZIP/RAR)', 
    previewable: false, 
    extensions: ['zip', 'rar'] 
  },
  { 
    value: 'pdf', 
    icon: '📄', 
    labelEn: 'PDF Document', 
    labelAr: 'ملف PDF', 
    previewable: true, 
    extensions: ['pdf'] 
  },
  { 
    value: 'ppt', 
    icon: '📽️', 
    labelEn: 'Presentation', 
    labelAr: 'عرض تقديمي', 
    previewable: false, 
    extensions: ['ppt', 'pptx'] 
  },
  { 
    value: 'excel', 
    icon: '📊', 
    labelEn: 'Excel Spreadsheet', 
    labelAr: 'ملف Excel', 
    previewable: false, 
    extensions: ['xls', 'xlsx'] 
  },
  { 
    value: 'word', 
    icon: '📝', 
    labelEn: 'Word Document', 
    labelAr: 'ملف Word', 
    previewable: false, 
    extensions: ['doc', 'docx'] 
  }
];
