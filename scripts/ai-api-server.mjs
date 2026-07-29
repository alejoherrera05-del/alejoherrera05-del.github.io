import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PORT = Number(process.env.ALEJANDRO_AI_PORT || 4174);
const envPath = resolve(process.cwd(), ".env.local");
const knowledgePath = resolve(process.cwd(), "knowledge", "fitness-knowledge.json");

function readLocalEnv(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
        }),
    );
  } catch {
    return {};
  }
}

const localEnv = readLocalEnv(envPath);
const apiKey = process.env.OPENAI_API_KEY || localEnv.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || localEnv.OPENAI_MODEL || "gpt-5-mini";
const knowledgeBase = JSON.parse(readFileSync(knowledgePath, "utf8"));

const evidenceItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "domain", "strength", "sourceUrl"],
  properties: {
    title: { type: "string", maxLength: 100 },
    domain: { type: "string", maxLength: 50 },
    strength: { type: "string", enum: ["baja", "moderada", "alta"] },
    sourceUrl: { type: "string", maxLength: 300 },
  },
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "confidence", "recommendations", "nextWeekFocus", "evidence"],
  properties: {
    title: { type: "string", maxLength: 55 },
    summary: { type: "string", maxLength: 420 },
    confidence: { type: "string", enum: ["baja", "media", "alta"] },
    recommendations: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "action", "reason", "dataUsed", "confidence"],
        properties: {
          title: { type: "string", maxLength: 70 },
          action: { type: "string", maxLength: 260 },
          reason: { type: "string", maxLength: 180 },
          dataUsed: { type: "string", maxLength: 140 },
          confidence: { type: "string", enum: ["baja", "media", "alta"] },
        },
      },
    },
    nextWeekFocus: { type: "string", maxLength: 260 },
    evidence: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: evidenceItemSchema,
    },
  },
};

const coachSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "answer", "safetyLevel", "nextStep", "evidence"],
  properties: {
    title: { type: "string", maxLength: 70 },
    answer: { type: "string", maxLength: 1100 },
    safetyLevel: { type: "string", enum: ["informativo", "precaución", "derivación médica"] },
    nextStep: { type: "string", maxLength: 320 },
    evidence: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: evidenceItemSchema,
    },
  },
};

function extractOutputText(response) {
  if (response.output_text) return response.output_text;
  for (const output of response.output || []) {
    for (const content of output.content || []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

async function generateWeeklyAnalysis(payload) {
  const selectedKnowledge = selectKnowledge("entrenamiento hipertrofia alimentación suplementación");
  return callStructuredResponse({
    schema: analysisSchema,
    schemaName: "weekly_training_analysis",
    instructions: [
      "Eres el analista semanal de Sistema Alejandro.",
      "Responde en español claro, breve y accionable para un objetivo de hipertrofia.",
      "Analiza solamente los datos entregados y declara baja confianza cuando falten registros.",
      "Aplica sobrecarga progresiva mediante repeticiones, carga, series de calidad y RPE.",
      "Nunca presentes 'romper el músculo' como objetivo; describe estímulo, adaptación y recuperación.",
      "No diagnostiques, no inventes lesiones y no prescribas fármacos.",
      "Cada recomendación debe citar exactamente qué datos usó.",
      "Entrega 2 o 3 recomendaciones breves; no repitas el resumen.",
      "Cada acción debe ser una oración completa de máximo 35 palabras; cada razón, máximo 24 palabras; datos usados, máximo 16 palabras.",
      "Termina siempre las oraciones completas y muy por debajo del límite de caracteres del esquema.",
      "Nunca muestres ids internos, JSON, nombres de campos ni listas técnicas: usa nombres humanos.",
      "Todos los ejercicios del plan parten de 4 series; no sugieras 3 series por defecto.",
      "No des recomendaciones de nutrición si el conjunto de datos no contiene registros de alimentación.",
      "No inventes adherencia, volumen histórico ni rangos personalizados cuando falten sesiones.",
      "Usa únicamente las fuentes de la base proporcionada y devuelve sus URL exactas en evidence.",
    ],
    input: { metrics: payload, knowledge: selectedKnowledge },
  });
}

async function answerCoachQuestion(payload) {
  const question = String(payload.question || "").trim();
  if (!question) throw new Error("Escribe una pregunta para el coach.");
  const selectedKnowledge = selectKnowledge(question);
  return callStructuredResponse({
    schema: coachSchema,
    schemaName: "fitness_coach_answer",
    instructions: [
      "Eres el coach educativo de Sistema Alejandro.",
      "Escribe answer en 90 a 130 palabras y nextStep en un maximo de 35 palabras. Termina siempre con oraciones completas, sin cerrar con dos puntos ni texto cortado.",
      "Responde en español con conocimiento de entrenamiento, alimentación, suplementos y farmacología deportiva basado solo en la base entregada.",
      "Diferencia evidencia alta, moderada y baja. Explica incertidumbre y evita afirmaciones absolutas.",
      "Puedes explicar riesgos y estado regulatorio de esteroides, anabólicos, SARMs y péptidos.",
      "Nunca diseñes ciclos, stacks, dosis, PCT, reconstitución, inyección, compra ni ocultamiento de sustancias.",
      "Si la pregunta pide una instrucción farmacológica, rechaza esa parte y ofrece riesgos, señales de alarma y preguntas para un médico.",
      "Ante dolor torácico, dificultad respiratoria, ictericia, orina oscura o debilidad marcada, usa safetyLevel derivación médica y prioriza atención inmediata.",
      "No diagnostiques ni interpretes análisis de laboratorio como una orden clínica.",
      "Incluye fuentes exactas de la base en evidence y una acción segura en nextStep.",
    ],
    input: { question, personalContext: payload.personalContext || {}, knowledge: selectedKnowledge },
  });
}

async function callStructuredResponse({ schema, schemaName, instructions, input }) {
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: instructions.join(" "),
      input: JSON.stringify(input),
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI respondió con estado ${response.status}.`);
  const body = await response.json();
  const outputText = extractOutputText(body);
  if (!outputText) throw new Error("La respuesta no incluyó el análisis estructurado.");
  return JSON.parse(outputText);
}

function selectKnowledge(query) {
  const normalized = String(query || "").toLowerCase();
  const domainMatchers = [
    { domain: "esteroides y anabólicos", pattern: /esteroid|anab[oó]lic|sarm|testoster|ciclo|pct|stack/ },
    { domain: "péptidos", pattern: /p[eé]ptid|bpc|tb-500|ipamore|cjc|hgh|igf/ },
    { domain: "suplementación", pattern: /suplement|creatin|cafe[ií]na|whey|prote[ií]na en polvo/ },
    { domain: "alimentación", pattern: /aliment|nutric|calor|prote[ií]na|carbo|grasa|dieta|super[aá]vit|d[eé]ficit/ },
    { domain: "antidopaje", pattern: /wada|dopaje|compet|prohibid/ },
    { domain: "entrenamiento", pattern: /entren|rutina|serie|repet|rpe|fuerza|hipertrof|fallo|volumen|carga/ },
  ];
  const matchedDomains = domainMatchers.filter((item) => item.pattern.test(normalized)).map((item) => item.domain);
  const domains = matchedDomains.length ? matchedDomains : ["entrenamiento", "alimentación", "suplementación"];
  const selected = knowledgeBase.entries.filter((entry) => domains.includes(entry.domain));
  return {
    version: knowledgeBase.version,
    safetyPolicy: knowledgeBase.safetyPolicy,
    entries: selected.slice(0, 8),
  };
}

const server = createServer((request, response) => {
  const origin = request.headers.origin;
  const allowedOrigin = origin === "http://127.0.0.1:4173" ? origin : "http://localhost:4173";
  response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method === "GET") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "sistema-alejandro-ai", configured: Boolean(apiKey) }));
    return;
  }
  if (request.method !== "POST") {
    response.writeHead(405, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }

  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) request.destroy();
  });
  request.on("end", async () => {
    try {
      const parsed = JSON.parse(body || "{}");
      if (!["generateWeeklyAnalysis", "askCoach"].includes(parsed.action)) throw new Error("Acción no permitida.");
      const data = parsed.action === "askCoach"
        ? await answerCoachQuestion(parsed.payload || {})
        : await generateWeeklyAnalysis(parsed.payload || {});
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true, data }));
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "ai_error" }));
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Sistema Alejandro AI listo en 127.0.0.1:${PORT}`);
});
