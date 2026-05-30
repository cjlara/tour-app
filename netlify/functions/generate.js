// generate.js — calls Claude to auto-generate all content for a new attraction
const https = require("https");

exports.handler = async function (event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const json = (code, obj) => ({
    statusCode: code,
    headers: { ...cors, "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  });

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };

  const token = (event.headers["x-admin-token"] || "").trim();
  const expected = (process.env.ADMIN_TOKEN || "cordoba2025").trim();
  if (token !== expected) return json(401, { error: "Token incorrecto" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(500, { error: "ANTHROPIC_API_KEY no configurada" });

  let body;
  try { body = JSON.parse(event.body); } catch { return json(400, { error: "JSON inválido" }); }

  const { name, location, type, city } = body;
  if (!name || !location) return json(400, { error: "Faltan name y location" });

  const typeLabels = {
    monument: "monumento histórico",
    restaurant: "restaurante o taberna",
    neighborhood: "barrio o zona histórica",
    museum: "museo",
    viewpoint: "mirador o espacio natural",
    market: "mercado o zona comercial",
    other: "atracción turística"
  };
  const typeLabel = typeLabels[type] || typeLabels.other;

  const prompt = `Eres un experto historiador y guía turístico especializado en ${city || location}. 
Genera información turística completa en español para: "${name}" (${typeLabel}) en ${location}.

Responde SOLO con un objeto JSON válido, sin markdown, sin backticks, con esta estructura exacta:
{
  "subtitle": "frase evocadora de 8-12 palabras que capture la esencia del lugar",
  "description": "descripción de 3-4 frases, informativa y atractiva para turistas",
  "history": "contexto histórico fascinante de 3-4 frases con datos precisos y anécdotas",
  "audioGuide": "narración inmersiva de 120-150 palabras en segunda persona (tú/vosotros), evocadora, con datos históricos precisos y una imagen sensorial vívida",
  "facts": [
    {"value": "dato numérico o año", "label": "etiqueta corta"},
    {"value": "dato numérico o año", "label": "etiqueta corta"},
    {"value": "dato numérico o año", "label": "etiqueta corta"}
  ],
  "tips": [
    "consejo práctico específico con precio/horario/detalle concreto",
    "consejo práctico específico",
    "consejo práctico específico",
    "consejo práctico específico"
  ],
  "dishes": ${type === "restaurant" ? '[{"name": "nombre del plato", "description": "descripción breve"}, {"name": "...", "description": "..."}]' : "null"},
  "color": "color hexadecimal que represente el carácter del lugar (dorado=#C9A84C, verde=#5A8A5E, azul=#6B7FA3, terracota=#B5541B, teal=#7A9E9F, marrón=#8B5E3C)",
  "lat": null,
  "lng": null,
  "suggestedTime": "hora recomendada de visita en formato HH:MM",
  "suggestedDuration": "duración recomendada p.ej. '60 min' o '2 horas'",
  "type": "${type || 'monument'}"
}`;

  try {
    const result = await callClaude(apiKey, prompt);
    const text = result.content && result.content[0] && result.content[0].text;
    if (!text) return json(500, { error: "Respuesta vacía de Claude" });

    // Parse JSON from response
    const clean = text.replace(/^```json\n?/i, "").replace(/^```\n?/i, "").replace(/```$/m, "").trim();
    let data;
    try {
      data = JSON.parse(clean);
    } catch (e) {
      return json(500, { error: "Claude no devolvió JSON válido", raw: text.slice(0, 500) });
    }

    // Ensure required fields
    data.name = name;
    data.location = location;
    data.photos = [];
    data.id = "stop-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    return json(200, { ok: true, stop: data });

  } catch (err) {
    return json(500, { error: err.message });
  }
};

function callClaude(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const req = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(new Error("Parse error: " + d.slice(0, 200))); }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(payload);
    req.end();
  });
}
