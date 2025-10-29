// Tipos para el sistema unificado de upload

export type UploadType = 'direct' | 'rf_exam' | 'future_questions' | 'custom_exam' | 'imp_exam';

export interface RFWindow {
  examName: string;
  promocionId: number;
  startDate: string;
  endDate: string;
}

export interface GlobalRelease {
  releaseDate: string;
  autoRelease: boolean;
}

export interface CustomExam {
  examName: string;
  examType: string;
  availabilityType: 'permanent' | 'temporary';
}

export interface UnifiedUploadOptions {
  uploadType: UploadType;
  immediatelyAvailable?: boolean;
  rfWindow?: RFWindow;
  globalRelease?: GlobalRelease;
  customExam?: CustomExam;
}

// Opciones específicas para IMP (solo usadas al llamar a la API IMP)
export interface ImpUploadOptions {
  themeNumber: number;
  themeName: string;
  impVariant: 1 | 2;  // 🆕 NUEVO: 1 = IMP1 (40 preguntas), 2 = IMP2 (20 preguntas)
  windowStartDate: string; // ISO string
  autoRelease: boolean;
  immediatelyAvailable?: boolean;
}

export interface UploadResult {
  success: boolean;
  message: string;
  totalProcessed: number;
  totalInserted: number;
  duplicates: number;
  errors: string[];
  historicId?: number;
  specificExamId?: number;
}

export interface ScheduledExam {
  id: number;
  exam_name: string;
  exam_type: 'rf' | 'future' | 'custom';
  status: 'draft' | 'active' | 'closed';
  total_questions: number;
  window_start_date?: string;
  window_end_date?: string;
  global_release_date?: string;
  auto_release: boolean;
  immediately_available: boolean;
  created_at: string;
}

export interface UnifiedUploadFormData {
  uploadType: UploadType;
  file: File | null;
  
  // RF Exam fields
  rfExamName: string;
  rfPromocionId: number;  // ID de la promoción (4=Promo42, 5=Promo43)
  rfStartDate: string;
  rfStartTime: string;
  rfEndDate: string;
  rfEndTime: string;
  rfUseAutoRelease: boolean;
  rfAutoReleaseDate: string;
  rfAutoReleaseTime: string;
  
  // Future Questions fields
  futureReleaseDate: string;
  futureReleaseTime: string;
  futureAutoRelease: boolean;
  
  // Custom Exam fields
  customExamName: string;
  customExamType: string;
  customAvailabilityType: 'permanent' | 'temporary';
  
  // IMP Exam fields
  impThemeNumber: string; // use string for inputs, convert before send
  impVariant: 1 | 2;  // 🆕 NUEVO: 1 = IMP1 (40 preguntas), 2 = IMP2 (20 preguntas)
  impThemeName: string;
  impWindowStartDate: string;
  impAutoRelease: boolean;

  // General options
  immediatelyAvailable: boolean;
}
