import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

// Helper function to convert camelCase object to snake_case
function toSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);

  return Object.keys(obj).reduce(
    (result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = obj[key];
      return result;
    },
    {} as any
  );
}

export function registerAnalysesRoutes(app: App, fastify: FastifyInstance) {
  // POST /api/analyses - Analyze a document
  fastify.post<{ Body: AnalysisRequestBody }>('/api/analyses', {
    schema: {
      description: 'Analyze a document using AI',
      tags: ['analyses'],
      body: {
        type: 'object',
        required: ['session_id', 'document_type', 'document_text'],
        properties: {
          session_id: { type: 'string', description: 'Session ID (UUID)' },
          document_type: {
            type: 'string',
            enum: [
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
            ],
            description: 'Type of document',
          },
          document_text: { type: 'string', description: 'Full text content of the document' },
          document_image_url: { type: 'string', description: 'Optional URL to document image' },
        },
      },
      response: {
        201: {
          description: 'Document analyzed successfully',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            session_id: { type: 'string' },
            document_type: { type: 'string' },
            document_text: { type: 'string' },
            document_image_url: { type: 'string' },
            risk_level: { type: 'string' },
            summary: { type: 'string' },
            key_findings: { type: 'array' },
            ai_recommendations: { type: 'string' },
            suggested_questions: { type: 'array' },
            market_comparison: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        429: {
          description: 'Free tier limit reached',
          type: 'object',
          properties: {
            error: { type: 'string' },
            analyses_used: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
        500: {
          description: 'Internal server error',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: AnalysisRequestBody }>, reply: FastifyReply) => {
    const { session_id, document_type, document_text, document_image_url } = request.body;

    app.logger.info(
      { session_id, document_type, textLength: document_text.length },
      'Analyzing document'
    );

    try {
      // Get current month_year
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Check usage limit
      const usageRow = await app.db
        .select()
        .from(schema.usageTracking)
        .where(
          and(
            eq(schema.usageTracking.sessionId, session_id),
            eq(schema.usageTracking.monthYear, monthYear)
          )
        );

      const analysisCount = usageRow.length > 0 ? usageRow[0].analysisCount : 0;

      if (analysisCount >= 3) {
        app.logger.info(
          { session_id, analysisCount, limit: 3 },
          'Free tier limit reached'
        );
        return reply.status(429).send({
          error: 'Free tier limit reached. Upgrade to Pro for unlimited analyses.',
          analyses_used: analysisCount,
          limit: 3,
        });
      }

      // Get AI analysis
      let aiResponse;

      if (process.env.OPENAI_API_KEY) {
        // Call OpenAI API
        const systemPrompt =
          'You are ClearCutCost, an expert document analyst specializing in contractor estimates, repair quotes, invoices, contracts, legal notices, insurance letters, medical bills, HOA notices, car loans, and financial documents. Your job is to protect consumers by identifying hidden fees, overpricing, missing scope, unusual terms, and financial risks. For car loans, focus on APR, loan term, monthly payment, total interest, add-ons, dealer fees, prepayment penalties, and whether the rate/payment is competitive. Anchor every market comparison to the actual submitted price, payment, APR, scope, and quantities in the document. Do not invent unrelated ranges. Always respond with valid JSON only — no markdown, no explanation outside the JSON.';

        const userPrompt = `Analyze this ${document_type} document and return a JSON object with exactly these fields:

{
  "risk_level": "low" | "moderate" | "high",
  "summary": "2-3 sentence plain-English summary of what this document is and the overall risk",
  "key_findings": [
    {
      "category": "hidden_fee" | "overpricing" | "missing_scope" | "unusual_terms" | "financial_risk" | "positive_note",
      "title": "Short title",
      "description": "Plain-English explanation of this finding",
      "severity": "low" | "moderate" | "high"
    }
  ],
  "ai_recommendations": "2-4 paragraphs of plain-English advice on what the user should do, what to negotiate, and what to watch out for",
  "suggested_questions": ["Question 1 to ask before agreeing", "Question 2", "Question 3", "Question 4", "Question 5"],
  "market_comparison": "If this is a contractor_estimate, repair_quote, invoice, or car_loan: first identify the submitted price/range/payment/APR from the document. If the submitted estimate is $1,000-$2,000, do not compare it to $10,000+ or $50 unless the document scope clearly supports that. Start with 'Expected market price: $X - $Y.' using a range for the same scope and similar order of magnitude, or 'Expected market APR/payment: X%-Y% APR / $X-$Y per month.' for car loans. If scope, quantity, or location is too unclear, return 'Expected market price: Not enough detail to estimate reliably.' and explain what is missing. For other document types, return null."
}

For risk_level, use "low" when the price appears within market, "moderate" when it is only slightly or moderately above market, and "high" when it is clearly over market.
Market comparison rules:
- Do not mix item-level prices with project-total prices.
- Do not use national whole-project ranges when the document is a small line item or narrow repair.
- When the submitted amount is a range, compare against that same range's midpoint and scope.
- If OCR/import text only says a file was imported and contains no actual extracted document text, do not invent prices.

Document text:
${document_text}`;

        app.logger.debug({ userPromptLength: userPrompt.length }, 'Calling OpenAI API');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          app.logger.error(
            { status: response.status, error: errorData },
            'OpenAI API error'
          );
          return reply.status(500).send({ error: 'Failed to analyze document' });
        }

        const openaiData = await response.json() as { choices: Array<{ message: { content: string } }> };
        const aiContent = openaiData.choices[0].message.content;

        app.logger.debug({ contentLength: aiContent.length }, 'Received OpenAI response');

        // Parse JSON response
        try {
          aiResponse = JSON.parse(aiContent);
        } catch (e) {
          app.logger.warn({ parseError: String(e) }, 'Failed to parse JSON, attempting extraction');
          // Try to extract JSON from response
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              aiResponse = JSON.parse(jsonMatch[0]);
            } catch (e2) {
              app.logger.error({ parseError: String(e2) }, 'Failed to extract and parse JSON');
              return reply.status(500).send({ error: 'Failed to parse AI response' });
            }
          } else {
            app.logger.error({}, 'No JSON found in AI response');
            return reply.status(500).send({ error: 'Failed to parse AI response' });
          }
        }
      } else {
        // Use mock data when API key is not available (for testing/demo)
        app.logger.info({}, 'Using mock analysis data (OPENAI_API_KEY not set)');
        aiResponse = {
          risk_level: 'moderate',
          summary: 'This document has been analyzed using mock data for demonstration purposes.',
          key_findings: [
            {
              category: 'positive_note',
              title: 'Demo Analysis',
              description: 'This is a demonstration analysis created without calling the OpenAI API.',
              severity: 'low',
            },
          ],
          ai_recommendations:
            'This is a demo analysis. In production, provide your OpenAI API key via the OPENAI_API_KEY environment variable for real AI-powered analysis.',
          suggested_questions: ['What would you like to know about this document?'],
          market_comparison: null,
        };
      }

      // Insert analysis
      const analysisRow = {
        sessionId: session_id,
        documentType: document_type as any,
        documentText: document_text,
        documentImageUrl: document_image_url || null,
        riskLevel: aiResponse.risk_level as any,
        summary: aiResponse.summary,
        keyFindings: aiResponse.key_findings || [],
        aiRecommendations: aiResponse.ai_recommendations,
        suggestedQuestions: aiResponse.suggested_questions || [],
        marketComparison: aiResponse.market_comparison || null,
      };

      const inserted = await app.db
        .insert(schema.analyses)
        .values(analysisRow)
        .returning();

      const analysis = inserted[0];

      app.logger.info(
        { analysisId: analysis.id, session_id },
        'Analysis created successfully'
      );

      // Upsert usage_tracking
      if (usageRow.length > 0) {
        await app.db
          .update(schema.usageTracking)
          .set({ analysisCount: analysisCount + 1 })
          .where(
            and(
              eq(schema.usageTracking.sessionId, session_id),
              eq(schema.usageTracking.monthYear, monthYear)
            )
          );
        app.logger.info(
          { session_id, newCount: analysisCount + 1 },
          'Usage tracking incremented'
        );
      } else {
        await app.db.insert(schema.usageTracking).values({
          sessionId: session_id,
          monthYear: monthYear,
          analysisCount: 1,
        });
        app.logger.info({ session_id, monthYear }, 'Usage tracking created');
      }

      return reply.status(201).send(toSnakeCase(analysis));
    } catch (error) {
      app.logger.error({ err: error, session_id: request.body.session_id }, 'Failed to analyze document');
      throw error;
    }
  });

  // GET /api/analyses - List recent analyses
  fastify.get<{ Querystring: { session_id: string } }>(
    '/api/analyses',
    {
      schema: {
        description: 'List recent analyses for a session',
        tags: ['analyses'],
        querystring: {
          type: 'object',
          required: ['session_id'],
          properties: {
            session_id: { type: 'string', description: 'Session ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              analyses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    document_type: { type: 'string' },
                    risk_level: { type: 'string' },
                    summary: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { session_id: string } }>, reply: FastifyReply) => {
      const { session_id } = request.query;

      app.logger.info({ session_id }, 'Listing analyses');

      try {
        const analyses = await app.db
          .select({
            id: schema.analyses.id,
            documentType: schema.analyses.documentType,
            riskLevel: schema.analyses.riskLevel,
            summary: schema.analyses.summary,
            createdAt: schema.analyses.createdAt,
          })
          .from(schema.analyses)
          .where(eq(schema.analyses.sessionId, session_id))
          .orderBy(desc(schema.analyses.createdAt))
          .limit(20);

        app.logger.info({ session_id, count: analyses.length }, 'Analyses listed');

        return reply.send({
          analyses: analyses.map((a) => ({
            id: a.id,
            document_type: a.documentType,
            risk_level: a.riskLevel,
            summary: a.summary,
            created_at: a.createdAt,
          })),
        });
      } catch (error) {
        app.logger.error({ err: error, session_id }, 'Failed to list analyses');
        throw error;
      }
    }
  );

  // GET /api/analyses/:id - Get full analysis
  fastify.get<{ Params: { id: string } }>(
    '/api/analyses/:id',
    {
      schema: {
        description: 'Get full analysis details',
        tags: ['analyses'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Analysis ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              session_id: { type: 'string' },
              document_type: { type: 'string' },
              document_text: { type: 'string' },
              document_image_url: { type: 'string' },
              risk_level: { type: 'string' },
              summary: { type: 'string' },
              key_findings: { type: 'array' },
              ai_recommendations: { type: 'string' },
              suggested_questions: { type: 'array' },
              market_comparison: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      app.logger.info({ id }, 'Fetching analysis');

      try {
        const analysis = await app.db.query.analyses.findFirst({
          where: eq(schema.analyses.id, id),
        });

        if (!analysis) {
          app.logger.info({ id }, 'Analysis not found');
          return reply.status(404).send({ error: 'Analysis not found' });
        }

        app.logger.info({ id }, 'Analysis fetched');

        return reply.send(toSnakeCase(analysis));
      } catch (error) {
        app.logger.error({ err: error, id }, 'Failed to fetch analysis');
        throw error;
      }
    }
  );

  // GET /api/usage - Get usage stats
  fastify.get<{ Querystring: { session_id: string } }>(
    '/api/usage',
    {
      schema: {
        description: 'Get current month usage for a session',
        tags: ['usage'],
        querystring: {
          type: 'object',
          required: ['session_id'],
          properties: {
            session_id: { type: 'string', description: 'Session ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              analyses_used: { type: 'integer' },
              limit: { type: 'integer' },
              is_pro: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { session_id: string } }>, reply: FastifyReply) => {
      const { session_id } = request.query;

      app.logger.info({ session_id }, 'Fetching usage stats');

      try {
        const now = new Date();
        const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const usageRow = await app.db
          .select()
          .from(schema.usageTracking)
          .where(
            and(
              eq(schema.usageTracking.sessionId, session_id),
              eq(schema.usageTracking.monthYear, monthYear)
            )
          );

        const analysesUsed = usageRow.length > 0 ? usageRow[0].analysisCount : 0;

        app.logger.info({ session_id, analysesUsed }, 'Usage stats fetched');

        return reply.send({
          analyses_used: analysesUsed,
          limit: 3,
          is_pro: false,
        });
      } catch (error) {
        app.logger.error({ err: error, session_id }, 'Failed to fetch usage stats');
        throw error;
      }
    }
  );
}

interface AnalysisRequestBody {
  session_id: string;
  document_type: string;
  document_text: string;
  document_image_url?: string;
}
