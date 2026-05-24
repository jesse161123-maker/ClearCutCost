import { createApplication } from '@specific-dev/framework';
import * as schema from './schema/schema.js';

const app = await createApplication(schema);

const seedData = {
  analyses: [
    {
      id: 'seed-analysis-001',
      sessionId: 'seed-session-demo-001',
      documentType: 'contractor_estimate' as const,
      documentText:
        'Roof replacement estimate: Materials $8,500, Labor $6,000, Permit fees $500, Disposal $800, Miscellaneous $2,200. Total: $18,000. Payment due upfront 100%. Warranty: 1 year parts only.',
      documentImageUrl: null,
      riskLevel: 'high' as const,
      summary:
        'This roofing estimate totals $18,000 and contains several red flags including a 100% upfront payment requirement and an unusually short 1-year warranty. The miscellaneous charge of $2,200 is vague and unexplained, and the overall pricing appears above market rate for a standard roof replacement.',
      keyFindings: [
        {
          category: 'hidden_fee',
          title: 'Vague Miscellaneous Charge',
          description:
            "A $2,200 'miscellaneous' line item with no breakdown is a common way contractors pad estimates. Always demand itemization.",
          severity: 'high',
        },
        {
          category: 'unusual_terms',
          title: '100% Upfront Payment',
          description:
            'Requiring full payment before work begins is a major red flag. Reputable contractors typically ask for 10-30% upfront.',
          severity: 'high',
        },
        {
          category: 'overpricing',
          title: 'Above-Market Total',
          description:
            'At $18,000, this estimate is approximately 25-35% above the national average for a standard asphalt shingle roof replacement on a 2,000 sq ft home.',
          severity: 'moderate',
        },
        {
          category: 'missing_scope',
          title: 'Short Warranty Period',
          description:
            'A 1-year parts-only warranty is well below industry standard. Most reputable roofers offer 5-10 year workmanship warranties.',
          severity: 'moderate',
        },
      ],
      aiRecommendations:
        'Do not pay 100% upfront under any circumstances. A standard payment structure is 10-30% deposit, progress payments, and final payment upon satisfactory completion. Demand a full itemized breakdown of the $2,200 miscellaneous charge before signing anything.\n\nGet at least two more competing estimates. Based on national averages, a roof replacement of this scope should cost between $10,000 and $14,000 depending on your region and materials. This estimate is significantly above that range.\n\nNegotiate the warranty terms. Industry-standard workmanship warranties are 5 years minimum, and many reputable contractors offer 10 years. A 1-year warranty suggests the contractor lacks confidence in their work.\n\nVerify the contractor is licensed, bonded, and insured in your state. Ask for proof of insurance and check their license number with your state contractor board before proceeding.',
      suggestedQuestions: [
        'Can you provide a full itemized breakdown of the $2,200 miscellaneous charge?',
        'Why is 100% upfront payment required — can we structure payments as deposit, mid-project, and completion?',
        'What is your workmanship warranty, and can you provide it in writing?',
        'Are you licensed and insured in this state, and can I verify your license number?',
        'What specific roofing materials and brands are included in this estimate?',
      ],
      marketComparison:
        'This estimate of $18,000 is above the national average for a standard asphalt shingle roof replacement. According to industry data, most homeowners pay between $8,000 and $15,000 for a full roof replacement on a typical single-family home, with the average around $11,500. This estimate runs approximately 25-35% above market rate. The labor cost of $6,000 is reasonable, but the materials cost of $8,500 and the unexplained miscellaneous charge of $2,200 are driving the total higher than expected. We recommend getting 2-3 competing bids before proceeding.',
      createdAt: new Date('2025-01-15T10:30:00Z'),
    },
    {
      id: 'seed-analysis-002',
      sessionId: 'seed-session-demo-001',
      documentType: 'medical_bill' as const,
      documentText:
        'Patient: John Doe. Date of service: 12/10/2024. ER Visit Level 4: $3,200. IV Fluids: $450. Blood Panel: $890. Physician fee: $650. Facility fee: $1,100. Total billed: $6,290. Insurance adjustment: -$2,100. Patient responsibility: $4,190. Payment due in 30 days.',
      documentImageUrl: null,
      riskLevel: 'moderate' as const,
      summary:
        'This emergency room bill totals $4,190 after insurance adjustment and contains a separate facility fee that many patients don\'t realize they can negotiate. The billing codes should be verified for accuracy, as ER bills frequently contain errors.',
      keyFindings: [
        {
          category: 'financial_risk',
          title: 'Separate Facility Fee',
          description:
            'The $1,100 facility fee is charged separately from the physician fee and is often negotiable or can be reduced through a financial hardship application.',
          severity: 'moderate',
        },
        {
          category: 'hidden_fee',
          title: 'High IV Fluids Charge',
          description:
            '$450 for IV fluids is significantly above cost. A bag of saline costs hospitals approximately $1-5. This is a common area of medical billing inflation.',
          severity: 'moderate',
        },
        {
          category: 'positive_note',
          title: 'Insurance Adjustment Applied',
          description:
            'The $2,100 insurance adjustment has been correctly applied, reducing the billed amount. Verify this matches your Explanation of Benefits (EOB) from your insurer.',
          severity: 'low',
        },
      ],
      aiRecommendations:
        'Before paying, request an itemized bill with CPT (billing) codes for every charge. Medical bills contain errors in approximately 80% of cases, and you have the right to a detailed itemization.\n\nContact the hospital\'s billing department and ask about financial assistance programs, payment plans, and prompt-pay discounts. Many hospitals will reduce bills by 20-40% for patients who ask.\n\nCompare this bill to the Explanation of Benefits (EOB) document from your insurance company. The patient responsibility amount should match. If it doesn\'t, call your insurer immediately.\n\nConsider hiring a medical billing advocate if the amount is significant. They typically work on contingency and can often reduce bills substantially.',
      suggestedQuestions: [
        'Can I get a fully itemized bill with CPT codes for every charge?',
        'Do you offer financial assistance, hardship programs, or prompt-pay discounts?',
        'Can I set up an interest-free payment plan?',
        'Does this match what my insurance company\'s EOB shows as my responsibility?',
        'Can the facility fee be reduced or waived?',
      ],
      marketComparison: null,
      createdAt: new Date('2025-01-14T14:20:00Z'),
    },
    {
      id: 'seed-analysis-003',
      sessionId: 'seed-session-demo-001',
      documentType: 'hoa_notice' as const,
      documentText:
        'Dear Homeowner, This notice is to inform you that your annual HOA dues of $1,200 are due by February 1, 2025. A late fee of $50 will be applied after the due date, with an additional $25 per month thereafter. Please also note that the community pool will be closed for maintenance January 15-31. Payments can be made online at the HOA portal or by check. Contact the management office with any questions.',
      documentImageUrl: null,
      riskLevel: 'low' as const,
      summary:
        'This is a routine HOA dues notice for $1,200 annually with standard late fee terms. The notice is straightforward and contains no unusual clauses or financial risks beyond the standard late fee structure.',
      keyFindings: [
        {
          category: 'positive_note',
          title: 'Standard Late Fee Structure',
          description:
            'The $50 initial late fee plus $25/month is within normal HOA late fee ranges and is clearly disclosed upfront.',
          severity: 'low',
        },
        {
          category: 'positive_note',
          title: 'Multiple Payment Options',
          description:
            'The HOA offers both online and check payment options, which is convenient and standard practice.',
          severity: 'low',
        },
        {
          category: 'missing_scope',
          title: 'No Grace Period Mentioned',
          description:
            'The notice doesn\'t specify if there is a grace period after the February 1 due date before the late fee is applied. Clarify this with the management office.',
          severity: 'low',
        },
      ],
      aiRecommendations:
        'This is a routine HOA notice with no major concerns. Pay your dues before February 1 to avoid the $50 late fee. If you anticipate difficulty paying, contact the HOA management office proactively — many HOAs offer payment plans for homeowners in good standing.\n\nKeep a copy of your payment confirmation for your records. If paying by check, note the check number and date. If paying online, save the confirmation email or screenshot the confirmation page.',
      suggestedQuestions: [
        'Is there a grace period after February 1 before the late fee is applied?',
        'Can I set up automatic payments for future years?',
        'Where can I find the full HOA fee schedule and what services are covered?',
        'Who do I contact if I have a dispute about my account balance?',
      ],
      marketComparison: null,
      createdAt: new Date('2025-01-13T09:15:00Z'),
    },
  ],
  usageTracking: [
    {
      id: 'seed-usage-001',
      sessionId: 'seed-session-demo-001',
      monthYear: '2025-01',
      analysisCount: 3,
      createdAt: new Date('2025-01-13T09:00:00Z'),
    },
  ],
};

try {
  // Insert analyses
  for (const analysis of seedData.analyses) {
    await app.db.insert(schema.analyses).values(analysis);
  }
  console.log('✓ Inserted seed analyses');

  // Insert usage tracking
  for (const usage of seedData.usageTracking) {
    await app.db.insert(schema.usageTracking).values(usage);
  }
  console.log('✓ Inserted seed usage tracking');

  console.log('Seed data inserted successfully');
  process.exit(0);
} catch (error) {
  console.error('Failed to seed data:', error);
  process.exit(1);
}
