// Tipos para el sistema unificado de upload

export type UploadType = 'direct' | 'rf_exam' | 'future_questions' | 'custom_exam';

export interface RFWindow {
  examName: string;
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
  
  // General options
  immediatelyAvailable: boolean;
}

