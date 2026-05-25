import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

loadLocalEnv();

const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const allowSubscriptionBypass = process.env.ALLOW_SUBSCRIPTION_BYPASS !== "false";
const revenueCatWebhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET || "";
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseEnabled = Boolean(supabaseUrl && supabaseServiceRoleKey);
const analyses = new Map();
const usageBySession = new Map();
const revenueCatEvents = [];
let globalUsageCount = 0;

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, {
        ok: true,
        version: "local-free-limit-v3",
        hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
        supabaseEnabled,
        globalUsageCount,
        allowSubscriptionBypass,
        revenueCatEventsReceived: revenueCatEvents.length
      });
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/api/admin/subscription-events")) {
      if (!isAuthorizedAdminRequest(req)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      sendJson(res, 200, {
        events: revenueCatEvents.slice(0, 50),
        total_events_received: revenueCatEvents.length
      });
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/api/usage")) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const sessionId = url.searchParams.get("session_id") || "anonymous";
      const persistedUsage = await getPersistedUsage(sessionId);
      sendJson(res, 200, {
        analyses_used: persistedUsage ?? usageBySession.get(sessionId) ?? 0,
        global_analyses_used: globalUsageCount,
        limit: 3,
        is_pro: false
      });
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/api/analyses?")) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const sessionId = url.searchParams.get("session_id") || "anonymous";
      const sessionAnalyses =
        (await listPersistedAnalyses(sessionId)) ??
        [...analyses.values()]
          .filter((analysis) => analysis.session_id === sessionId)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20)
          .map(({ id, document_type, risk_level, summary, created_at }) => ({
            id,
            document_type,
            risk_level,
            summary,
            created_at
          }));

      sendJson(res, 200, { analyses: sessionAnalyses });
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/api/analyses/")) {
      const id = decodeURIComponent(req.url.split("/api/analyses/")[1] || "");
      const analysis = (await getPersistedAnalysis(id)) ?? analyses.get(id);

      if (!analysis) {
        sendJson(res, 404, { error: "Analysis not found" });
        return;
      }

      sendJson(res, 200, analysis);
      return;
    }

    if (req.method === "POST" && req.url === "/api/analyses") {
      const body = await readJsonBody(req);
      const analysis = await createAnalysis(body);
      sendJson(res, 201, analysis);
      return;
    }

    if (req.method === "POST" && req.url === "/analyze") {
      const body = await readJsonBody(req);
      const result = await analyzeCost(body);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && req.url === "/webhooks/revenuecat") {
      if (!isAuthorizedRevenueCatWebhook(req)) {
        sendJson(res, 401, { error: "Unauthorized webhook request" });
        return;
      }

      const body = await readJsonBody(req);
      const event = recordRevenueCatEvent(body);
      sendJson(res, 200, { received: true, event });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const status = error.status || 500;
    sendJson(res, status, { error: error.message || "Unexpected server error" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`ClearCutCost temporary backend running on http://localhost:${port}`);
  console.log(`Free analysis limit active. Subscription bypass: ${allowSubscriptionBypass ? "on" : "off"}`);
  console.log(`RevenueCat webhook logging active at /webhooks/revenuecat`);
  console.log(`Supabase persistence: ${supabaseEnabled ? "on" : "off"}`);
});

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function analyzeCost(input) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error("Missing OPENAI_API_KEY. Paste your key into server/.env first.");
    error.status = 500;
    throw error;
  }

  const prompt = buildPrompt(input);
  const content = buildOpenAIUserContent(input, prompt);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: "You analyze project, repair, loan, and document costs. Return concise, practical JSON. Anchor every market comparison to the actual submitted price, payment, APR, scope, and quantities in the document. Do not invent unrelated ranges. If scope is too thin for a reliable market estimate, say what details are missing instead of guessing."
        },
        {
          role: "user",
          content
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || "OpenAI request failed";
    const error = new Error(message);
    error.status = response.status === 429 ? 502 : response.status;
    throw error;
  }

  return {
    analysis: extractOutputText(data),
    raw: data
  };
}

async function createAnalysis(input) {
  const sessionId = input?.session_id || "anonymous";
  const documentType = input?.document_type || "other";
  const documentText = input?.document_text || "";
  const documentFile = normalizeDocumentFile(input?.document_file);
  const isSubscribed = allowSubscriptionBypass && Boolean(input?.is_subscribed);

  if (!documentText.trim() && !documentFile) {
    const error = new Error("document_text or document_file is required");
    error.status = 400;
    throw error;
  }

  const used = usageBySession.get(sessionId) || 0;
  const effectiveUsed = Math.max(used, globalUsageCount);

  console.log(
    `[Analysis] session=${sessionId} sessionUsed=${used} globalUsed=${globalUsageCount} subscribedBypass=${isSubscribed}`
  );

  if (!isSubscribed && effectiveUsed >= 3) {
    const error = new Error("Free tier limit reached. Upgrade to Pro for unlimited analyses.");
    error.status = 429;
    throw error;
  }

  const aiResponse = await analyzeDocumentJson(documentType, documentText, documentFile).catch((error) => {
    if (error.status === 402 || error.status === 429 || error.status === 502) {
      return createQuotaFallbackAnalysis(error.message);
    }

    throw error;
  });
  const analysis = {
    id: randomUUID(),
    session_id: sessionId,
    document_type: documentType,
    document_text: documentText,
    document_file_name: documentFile?.name || null,
    document_image_url: input?.document_image_url || null,
    risk_level: normalizeRisk(aiResponse.risk_level),
    summary: String(aiResponse.summary || "Analysis complete."),
    key_findings: normalizeFindings(aiResponse.key_findings),
    ai_recommendations: String(aiResponse.ai_recommendations || ""),
    suggested_questions: Array.isArray(aiResponse.suggested_questions) ? aiResponse.suggested_questions.map(String) : [],
    market_comparison: aiResponse.market_comparison ? String(aiResponse.market_comparison) : null,
    created_at: new Date().toISOString()
  };

  analyses.set(analysis.id, analysis);
  usageBySession.set(sessionId, used + 1);
  globalUsageCount += 1;
  await persistAnalysis(analysis, {
    submitted_price: aiResponse.submitted_price ?? null,
    is_subscribed: isSubscribed
  });

  return analysis;
}

async function analyzeDocumentJson(documentType, documentText, documentFile) {
  const result = await analyzeCost({
    task: "Return JSON only.",
    document_type: documentType,
    document_text: documentText,
    document_file: documentFile
      ? {
          name: documentFile.name,
          mime_type: documentFile.mime_type,
          kind: documentFile.mime_type === "application/pdf" ? "pdf" : "image"
        }
      : null,
    attachments: documentFile ? [documentFile] : [],
    required_shape: {
      submitted_price: "Exact submitted total, price range, monthly payment, or APR found in the document. Use null if not present.",
      risk_level: "low | moderate | high. Use low when the price appears within market, moderate when it is only slightly or moderately above market, and high when it is clearly over market.",
      summary: "2-3 sentence plain-English summary",
      key_findings: [
        {
          category: "hidden_fee | overpricing | missing_scope | unusual_terms | financial_risk | positive_note",
          title: "Short title",
          description: "Plain-English explanation",
          severity: "low | moderate | high"
        }
      ],
      ai_recommendations: "2-4 paragraphs of advice",
      suggested_questions: ["Question 1", "Question 2", "Question 3"],
      market_comparison: "For contractor_estimate, repair_quote, invoice, or car_loan: first identify the submitted price/range/payment/APR from the document. If the submitted estimate is $1,000-$2,000, do not compare it to $10,000+ or $50 unless the document scope clearly supports that. Start with 'Expected market price: $X - $Y.' using a range for the same scope and similar order of magnitude, or 'Expected market APR/payment: X%-Y% APR / $X-$Y per month.' for car loans. If scope, quantity, or location is too unclear, return 'Expected market price: Not enough detail to estimate reliably.' and explain what is missing."
    },
    market_comparison_rules: [
      "Do not mix item-level prices with project-total prices.",
      "Do not use national whole-project ranges when the document is a small line item or narrow repair.",
      "When the submitted amount is a range, compare against that same range's midpoint and scope.",
      "If OCR/import text only says a file was imported and contains no actual extracted document text, do not invent prices."
    ]
  });

  return parseJsonFromText(result.analysis);
}

function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (match) {
      return JSON.parse(match[0]);
    }

    return {
      risk_level: "moderate",
      summary: text || "The document was analyzed, but the response could not be structured.",
      key_findings: [],
      ai_recommendations: text || "",
      suggested_questions: [],
      market_comparison: null
    };
  }
}

function normalizeRisk(value) {
  return ["low", "moderate", "high"].includes(value) ? value : "moderate";
}

function normalizeFindings(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((finding) => ({
    category: normalizeCategory(finding?.category),
    title: String(finding?.title || "Finding"),
    description: String(finding?.description || ""),
    severity: normalizeRisk(finding?.severity)
  }));
}

function normalizeCategory(value) {
  const allowed = [
    "hidden_fee",
    "overpricing",
    "missing_scope",
    "unusual_terms",
    "financial_risk",
    "positive_note"
  ];

  return allowed.includes(value) ? value : "financial_risk";
}

function createQuotaFallbackAnalysis(message) {
  return {
    risk_level: "moderate",
    summary: "OpenAI could not run the live analysis because the API account is over its current quota or billing limit. This temporary demo result confirms the app upload and analysis flow is connected.",
    key_findings: [
      {
        category: "financial_risk",
        title: "OpenAI quota limit",
        description: message || "The OpenAI API rejected the request because the account has exceeded its current quota.",
        severity: "moderate"
      }
    ],
    ai_recommendations: "Check the OpenAI Platform billing and usage pages for the API key's project. Add billing credits or raise the project budget, then restart the local backend and run the analysis again for a real AI result.",
    suggested_questions: [
      "Does the OpenAI project attached to this API key have billing enabled?",
      "Has the project monthly budget or prepaid credit balance been exhausted?",
      "Is this API key from the same project where billing was added?"
    ],
    market_comparison: null
  };
}

function recordRevenueCatEvent(payload) {
  const eventPayload = payload?.event && typeof payload.event === "object" ? payload.event : payload;
  const event = {
    id: String(eventPayload?.id || payload?.id || randomUUID()),
    type: String(eventPayload?.type || payload?.type || "UNKNOWN"),
    app_user_id: eventPayload?.app_user_id || payload?.app_user_id || null,
    product_id: eventPayload?.product_id || payload?.product_id || null,
    entitlement_ids: eventPayload?.entitlement_ids || payload?.entitlement_ids || [],
    environment: eventPayload?.environment || payload?.environment || null,
    purchased_at_ms: eventPayload?.purchased_at_ms || payload?.purchased_at_ms || null,
    expiration_at_ms: eventPayload?.expiration_at_ms || payload?.expiration_at_ms || null,
    received_at: new Date().toISOString()
  };

  revenueCatEvents.unshift(event);

  if (revenueCatEvents.length > 250) {
    revenueCatEvents.length = 250;
  }

  console.log(
    `[RevenueCat] ${event.type} app_user_id=${event.app_user_id || "unknown"} product=${event.product_id || "unknown"} environment=${event.environment || "unknown"}`
  );

  persistRevenueCatEvent(event, payload).catch((error) => {
    console.warn("[Supabase] Failed to persist RevenueCat event:", error.message);
  });

  return event;
}

async function getPersistedUsage(sessionId) {
  if (!supabaseEnabled) {
    return null;
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const query = new URLSearchParams({
    session_id: `eq.${sessionId}`,
    created_at: `gte.${startOfMonth.toISOString()}`,
    select: "id"
  });

  try {
    const rows = await supabaseRequest(`/rest/v1/analyses?${query.toString()}`);

    return Array.isArray(rows) ? rows.length : null;
  } catch (error) {
    console.warn("[Supabase] Failed to load persisted usage:", error.message);
    return null;
  }
}

async function listPersistedAnalyses(sessionId) {
  if (!supabaseEnabled) {
    return null;
  }

  const query = new URLSearchParams({
    session_id: `eq.${sessionId}`,
    select: "id,document_type,risk_level,summary,created_at",
    order: "created_at.desc",
    limit: "20"
  });

  try {
    return await supabaseRequest(`/rest/v1/analyses?${query.toString()}`);
  } catch (error) {
    console.warn("[Supabase] Failed to list persisted analyses:", error.message);
    return null;
  }
}

async function getPersistedAnalysis(id) {
  if (!supabaseEnabled) {
    return null;
  }

  const query = new URLSearchParams({
    id: `eq.${id}`,
    select: "*",
    limit: "1"
  });

  try {
    const rows = await supabaseRequest(`/rest/v1/analyses?${query.toString()}`);

    return Array.isArray(rows) ? rows[0] ?? null : null;
  } catch (error) {
    console.warn("[Supabase] Failed to load persisted analysis:", error.message);
    return null;
  }
}

async function persistAnalysis(analysis, metadata = {}) {
  if (!supabaseEnabled) {
    return;
  }

  try {
    await supabaseRequest("/rest/v1/analyses", {
      method: "POST",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        id: analysis.id,
        session_id: analysis.session_id,
        document_type: analysis.document_type,
        document_text: analysis.document_text,
        document_file_name: analysis.document_file_name,
        document_image_url: analysis.document_image_url,
        risk_level: analysis.risk_level,
        summary: analysis.summary,
        key_findings: analysis.key_findings,
        ai_recommendations: analysis.ai_recommendations,
        suggested_questions: analysis.suggested_questions,
        market_comparison: analysis.market_comparison,
        submitted_price: metadata.submitted_price,
        is_subscribed: Boolean(metadata.is_subscribed),
        created_at: analysis.created_at
      })
    });
  } catch (error) {
    console.warn("[Supabase] Failed to persist analysis:", error.message);
  }
}

async function persistRevenueCatEvent(event, rawPayload) {
  if (!supabaseEnabled) {
    return;
  }

  await supabaseRequest("/rest/v1/revenuecat_events", {
    method: "POST",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      event_id: event.id,
      type: event.type,
      app_user_id: event.app_user_id,
      product_id: event.product_id,
      entitlement_ids: event.entitlement_ids,
      environment: event.environment,
      purchased_at_ms: event.purchased_at_ms,
      expiration_at_ms: event.expiration_at_ms,
      raw_payload: rawPayload,
      received_at: event.received_at
    })
  });
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase ${response.status}: ${message.slice(0, 300)}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  return text ? JSON.parse(text) : null;
}

function normalizeSupabaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function isAuthorizedRevenueCatWebhook(req) {
  if (!revenueCatWebhookSecret) {
    return true;
  }

  return getBearerToken(req) === revenueCatWebhookSecret;
}

function isAuthorizedAdminRequest(req) {
  if (!revenueCatWebhookSecret) {
    return true;
  }

  return getBearerToken(req) === revenueCatWebhookSecret;
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1] || "";
}

function buildPrompt(input) {
  if (typeof input === "string") {
    return input;
  }

  return [
    "Analyze this cost request for ClearCutCost.",
    "",
    JSON.stringify(stripAttachmentData(input ?? {}), null, 2)
  ].join("\n");
}

function buildOpenAIUserContent(input, prompt) {
  const content = [
    {
      type: "input_text",
      text: prompt
    }
  ];

  const attachments = Array.isArray(input?.attachments) ? input.attachments : [];

  for (const attachment of attachments) {
    if (!attachment?.base64 || !attachment?.mime_type) {
      continue;
    }

    if (attachment.mime_type === "application/pdf") {
      content.push({
        type: "input_file",
        filename: attachment.name || "document.pdf",
        file_data: attachment.base64
      });
      continue;
    }

    if (attachment.mime_type.startsWith("image/")) {
      content.push({
        type: "input_image",
        image_url: `data:${attachment.mime_type};base64,${attachment.base64}`,
        detail: "high"
      });
    }
  }

  return content;
}

function normalizeDocumentFile(file) {
  if (!file || typeof file !== "object") {
    return null;
  }

  const name = String(file.name || "uploaded-document");
  const mimeType = String(file.mime_type || "");
  const base64 = String(file.base64 || "").replace(/^data:[^,]+,/, "");

  if (!base64 || !mimeType) {
    return null;
  }

  if (mimeType !== "application/pdf" && !mimeType.startsWith("image/")) {
    const error = new Error("Only image and PDF uploads are supported");
    error.status = 400;
    throw error;
  }

  return {
    name,
    mime_type: mimeType,
    base64
  };
}

function stripAttachmentData(input) {
  if (!input || typeof input !== "object") {
    return input;
  }

  const clone = { ...input };

  if (Array.isArray(clone.attachments)) {
    clone.attachments = clone.attachments.map((attachment) => ({
      name: attachment?.name,
      mime_type: attachment?.mime_type,
      base64: attachment?.base64 ? `[base64 omitted, ${attachment.base64.length} chars]` : null
    }));
  }

  return clone;
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  return data.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text)
    ?.filter(Boolean)
    ?.join("\n")
    || "";
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 25_000_000) {
        reject(Object.assign(new Error("Request body is too large"), { status: 413 }));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON"), { status: 400 }));
      }
    });

    req.on("error", reject);
  });
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}
