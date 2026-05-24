import { DocumentType } from '@/utils/api';

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contractor_estimate: 'Contractor Estimate',
  repair_quote: 'Repair Quote',
  invoice: 'Invoice',
  contract: 'Contract',
  legal_notice: 'Legal Notice',
  insurance_letter: 'Insurance Letter',
  medical_bill: 'Medical Bill',
  hoa_notice: 'HOA Notice',
  car_loan: 'Car Loan',
  financial_document: 'Financial Document',
  other: 'Other',
};

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'contractor_estimate', label: 'Contractor Estimate' },
  { value: 'repair_quote', label: 'Repair Quote' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'contract', label: 'Contract' },
  { value: 'legal_notice', label: 'Legal Notice' },
  { value: 'insurance_letter', label: 'Insurance Letter' },
  { value: 'medical_bill', label: 'Medical Bill' },
  { value: 'hoa_notice', label: 'HOA Notice' },
  { value: 'car_loan', label: 'Car Loan' },
  { value: 'financial_document', label: 'Financial Document' },
  { value: 'other', label: 'Other' },
];
