import { pgTable, text, timestamp, uuid, integer, jsonb, pgEnum, unique } from 'drizzle-orm/pg-core';

export const documentTypeEnum = pgEnum('document_type', [
  'contractor_estimate',
  'repair_quote',
  'invoice',
  'contract',
  'legal_notice',
  'insurance_letter',
  'medical_bill',
  'hoa_notice',
  'car_loan',
  'financial_document',
  'other',
]);

export const riskLevelEnum = pgEnum('risk_level', ['low', 'moderate', 'high']);

export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull(),
  documentType: documentTypeEnum('document_type').notNull(),
  documentText: text('document_text').notNull(),
  documentImageUrl: text('document_image_url'),
  riskLevel: riskLevelEnum('risk_level').notNull(),
  summary: text('summary').notNull(),
  keyFindings: jsonb('key_findings').notNull().default([]),
  aiRecommendations: text('ai_recommendations').notNull(),
  suggestedQuestions: jsonb('suggested_questions').notNull().default([]),
  marketComparison: text('market_comparison'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usageTracking = pgTable(
  'usage_tracking',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull(),
    monthYear: text('month_year').notNull(),
    analysisCount: integer('analysis_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.sessionId, table.monthYear)],
);
