export interface CourseTitleSuggestion {
  title: string;
  rationale?: string;
  topics?: string[];
}

export interface Unit {
  id: string;
  name: string;
  order: number;
}

export type CourseMode = 'curriculum' | 'general';

export interface CourseBasicInfo {
  name: string;
  mode: CourseMode;
  subjectSlug: string;
  currentTerm: number;
}
