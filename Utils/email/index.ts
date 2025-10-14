// 🚀 OPTIMIZED EMAIL MODULE EXPORTS - PRODUCTION READY

// Types
export * from './types';

// Core functions - OPTIMIZED VERSION
export { 
  sendWelcomeEmail, 
  sendMatchedJobsEmail, 
  sendBatchEmails,
  EMAIL_PERFORMANCE_METRICS 
} from './optimizedSender';

// Templates - GMAIL-COMPATIBLE (Table-based layout with inline styles)
export { 
  createWelcomeEmailGmail as createWelcomeEmail, 
  createJobMatchesEmailGmail as createJobMatchesEmail
} from './gmailCompatibleTemplates';

// Keep original templates available
export { 
  createWelcomeEmail as createWelcomeEmailOriginal,
  createJobMatchesEmail as createJobMatchesEmailOriginal,
  EMAIL_OPTIMIZATION_METRICS 
} from './optimizedTemplates';

// Clients (if needed externally)
export { getResendClient, getSupabaseClient, EMAIL_CONFIG } from './clients';

// Feedback system integration
export { EmailFeedbackIntegration, emailFeedbackHelpers } from './feedbackIntegration';

// Email preview system
export { EmailPreviewSystem, emailPreview } from './emailPreview';

// Performance monitoring
export { EMAIL_PERFORMANCE_METRICS as performanceMetrics } from './optimizedSender';
