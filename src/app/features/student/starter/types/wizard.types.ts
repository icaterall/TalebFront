export type WizardStep = 1 | 2 | 3;

export type WarningModalType = 'goBack' | 'deleteContent' | null;

export type ContentType = 'video' | 'resources' | 'text' | 'audio' | 'quiz' | null;

export type PendingAiAction = 'textContent' | null;

export interface WizardState {
  currentStep: WizardStep;
  step2Locked: boolean;
  showWarningModal: boolean;
  warningModalType: WarningModalType;
  showContentTypeModal: boolean;
  selectedContentType: ContentType;
  showTextEditor: boolean;
  showAIHintModal: boolean;
  pendingAiAction: PendingAiAction;
}
