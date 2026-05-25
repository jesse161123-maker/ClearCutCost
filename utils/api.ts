const BASE_URL = 'https://clearcutcost.onrender.com';

export type DocumentType =
  | 'contractor_estimate'
  | 'repair_quote'
  | 'invoice'
  | 'contract'
  | 'legal_notice'
  | 'insurance_letter'
  | 'medical_bill'
  | 'hoa_notice'
  | 'car_loan'
  | 'financial_document'
  | 'other';

export type RiskLevel = 'low' | 'moderate' | 'high';

export type FindingCategory =
  | 'hidden_fee'
  | 'overpricing'
  | 'missing_scope'
  | 'unusual_terms'
  | 'financial_risk'
  | 'positive_note';

export interface KeyFinding {
  category: FindingCategory;
  title: string;
  description: string;
  severity: RiskLevel;
}

export interface Analysis {
  id: string;
  session_id: string;
  document_type: DocumentType;
  document_text: string;
  document_image_url?: string | null;
  risk_level: RiskLevel;
  summary: string;
  key_findings: KeyFinding[];
  ai_recommendations: string;
  suggested_questions: string[];
  market_comparison?: string | null;
  created_at: string;
}

export interface AnalysisSummary {
  id: string;
  document_type: string;
  risk_level: string;
  summary: string;
  created_at: string;
}

export interface CreateAnalysisRequest {
  session_id: string;
  document_type: DocumentType;
  document_text: string;
  is_subscribed?: boolean;
  document_file?: {
    name: string;
    mime_type: string;
    base64: string;
  } | null;
}

export interface UsageInfo {
  used: number;
  analyses_used?: number;
  limit: number;
  is_pro: boolean;
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  console.log(`[API] ${options?.method ?? 'GET'} ${url}`);
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    console.error(`[API] Error ${response.status}:`, text.slice(0, 200));
    let message = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed?.error === 'string') {
        message = parsed.error;
      }
    } catch {
      // Keep raw response text when the backend does not return JSON.
    }
    const err = new Error(`HTTP ${response.status}: ${message}`);
    (err as any).status = response.status;
    throw err;
  }
  const data = await response.json();
  console.log(`[API] Response from ${url}:`, JSON.stringify(data).slice(0, 200));
  return data as T;
}

export async function createAnalysis(data: CreateAnalysisRequest): Promise<Analysis> {
  console.log('[API] Creating analysis:', {
    document_type: data.document_type,
    text_length: data.document_text.length,
    has_file: Boolean(data.document_file),
  });
  return fetchJSON<Analysis>(`${BASE_URL}/api/analyses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function listAnalyses(sessionId: string): Promise<AnalysisSummary[]> {
  console.log('[API] Listing analyses for session:', sessionId);
  const result = await fetchJSON<AnalysisSummary[] | { analyses?: AnalysisSummary[]; data?: AnalysisSummary[] }>(
    `${BASE_URL}/api/analyses?session_id=${encodeURIComponent(sessionId)}`
  );
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object') {
    if (Array.isArray((result as any).analyses)) return (result as any).analyses;
    if (Array.isArray((result as any).data)) return (result as any).data;
  }
  return [];
}

export async function getAnalysis(id: string): Promise<Analysis> {
  console.log('[API] Getting analysis:', id);
  return fetchJSON<Analysis>(`${BASE_URL}/api/analyses/${id}`);
}

export async function getUsage(sessionId: string): Promise<UsageInfo> {
  console.log('[API] Getting usage for session:', sessionId);
  const raw = await fetchJSON<any>(`${BASE_URL}/api/usage?session_id=${encodeURIComponent(sessionId)}`);
  // Normalize field name: backend may return analyses_used or used
  return {
    used: raw.used ?? raw.analyses_used ?? 0,
    analyses_used: raw.analyses_used,
    limit: raw.limit ?? 3,
    is_pro: raw.is_pro ?? false,
  };
}
