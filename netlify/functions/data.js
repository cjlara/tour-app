// data.js — serves tour.json fresh from GitHub (no static cache)
const https = require("https");

// Default tour data embedded (used only if GitHub fails AND no static file)
const DEFAULT_TOUR = {
  "meta": {
    "title": "Córdoba",
    "subtitle": "La Ciudad Califal",
    "description": "Donde tres civilizaciones se fundieron para crear uno de los centros culturales más brillantes de la historia.",
    "heroImage": "",
    "videoUrl": "",
    "version": "3.1",
    "updatedAt": "2025-01-01T00:00:00Z"
  },
  "days": [
    {
      "id": "day-1",
      "title": "Día 1 · El Corazón Medieval",
      "description": "El centro histórico declarado Patrimonio de la Humanidad",
      "stops": [
        {
          "id": "stop-mezquita",
          "order": 1,
          "time": "09:00",
          "duration": "90 min",
          "type": "monument",
          "color": "#C9A84C",
          "name": "Mezquita-Catedral",
          "location": "Córdoba, España",
          "lat": 37.8789,
          "lng": -4.7794,
          "address": "Calle Cardenal Herrero, 1, 14003 Córdoba",
          "subtitle": "El bosque de columnas donde el Islam y el Cristianismo coexisten",
          "description": "La Mezquita-Catedral de Córdoba es una de las obras maestras de la arquitectura mundial. Sobre una antigua basílica visigoda, el califa Abd al-Rahman I ordenó en el año 784 la construcción de la gran mezquita.",
          "history": "En 1236, Fernando III reconquistó Córdoba y consagró la mezquita como catedral. Los reyes castellanos construyeron el coro y la capilla mayor en su interior en el siglo XVI.",
          "audioSections": [
            {
              "id": "as-1",
              "title": "El acceso: Patio de los Naranjos",
              "text": "Antes de entrar, detente en el Patio de los Naranjos. Este espacio abierto era donde los fieles musulmanes se purificaban antes de la oración. Las fuentes que ves son originales del siglo X.",
              "mapImage": ""
            },
            {
              "id": "as-2",
              "title": "El bosque de columnas",
              "text": "Imagina el año 786. Abd al-Rahman el Primero levanta este bosque de columnas. Cada columna cuenta una historia diferente: algunas vienen de templos romanos, otras de palacios visigodos.",
              "mapImage": ""
            },
            {
              "id": "as-3",
              "title": "El Mihrab",
              "text": "El mihrab es el corazón espiritual de la mezquita. Esta hornacina señala la dirección de La Meca. Observa los mosaicos de oro y el arco de herradura lobulado.",
              "mapImage": ""
            }
          ],
          "videoUrl": "",
          "facts": [
            {
              "value": "784",
              "label": "Año fundación"
            },
            {
              "value": "856",
              "label": "Columnas"
            },
            {
              "value": "23.400m²",
              "label": "Superficie"
            }
          ],
          "tips": [
            "Compra la entrada online — las colas pueden ser de más de una hora",
            "Las entradas de 8:30 a 9:30h son gratuitas para el culto"
          ],
          "photos": [],
          "dishes": null,
          "website": "https://mezquita-catedraldecordoba.es",
          "bookingUrl": "",
          "phone": "",
          "priceRange": ""
        },
        {
          "id": "stop-almuerzo",
          "order": 2,
          "time": "13:00",
          "duration": "90 min",
          "type": "restaurant",
          "color": "#E84040",
          "name": "Taberna La Viuda",
          "location": "Córdoba, España",
          "lat": 37.8753,
          "lng": -4.7851,
          "address": "Calle San Basilio 52, 14004 Córdoba",
          "subtitle": "Cocina cordobesa auténtica junto al Alcázar",
          "description": "Una de las tabernas más auténticas de Córdoba. Ambiente de mesas de madera, azulejos en las paredes, y una cocina que huele a guisos de toda la vida.",
          "history": "La gastronomía cordobesa es heredera directa de Al-Ándalus. El salmorejo tiene sus raíces en la mazamorra árabe.",
          "audioSections": [
            {
              "id": "as-r1",
              "title": "Los platos imprescindibles",
              "text": "El salmorejo cordobés es la estrella. Más espeso que el gazpacho, elaborado con tomate, pan, ajo y aceite de oliva. Se corona con jamón ibérico y huevo duro.",
              "mapImage": ""
            }
          ],
          "videoUrl": "",
          "facts": [
            {
              "value": "4.6★",
              "label": "Valoración"
            },
            {
              "value": "13-16h",
              "label": "Horario"
            },
            {
              "value": "€€",
              "label": "Precio medio"
            }
          ],
          "tips": [
            "Reserva con antelación, especialmente fines de semana",
            "Pide la cerveza artesana de la casa"
          ],
          "photos": [],
          "dishes": [
            {
              "name": "Salmorejo cordobés",
              "description": "Con jamón ibérico y huevo duro"
            },
            {
              "name": "Flamenquín",
              "description": "Rulo de jamón y lomo empanado"
            },
            {
              "name": "Rabo de toro",
              "description": "Guiso tradicional estofado"
            }
          ],
          "website": "https://tabernalaviuda.es",
          "bookingUrl": "https://www.thefork.es/restaurante/taberna-la-viuda",
          "phone": "+34 957 29 69 05",
          "priceRange": "€€"
        }
      ]
    }
  ]
};

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };

  const REPO   = process.env.GITHUB_REPO   || "";
  const GTOKEN = process.env.GITHUB_TOKEN  || "";
  const BRANCH = process.env.GITHUB_BRANCH || "main";

  console.log("[data.js] REPO=" + REPO + " hasToken=" + !!GTOKEN);

  if (!REPO || !GTOKEN) {
    console.log("[data.js] No GitHub config, serving default");
    return { statusCode: 200, headers, body: JSON.stringify(DEFAULT_TOUR) };
  }

  try {
    // Try raw.githubusercontent.com first - updates instantly, no API rate limits
    const rawUrl = "https://raw.githubusercontent.com/" + REPO + "/" + BRANCH + "/data/tour.json?_t=" + Date.now();
    const rawResult = await fetchRaw(rawUrl);
    const parsed = JSON.parse(rawResult);
    console.log("[data.js] Served from raw GitHub, days=" + (parsed.days || []).length);
    return { statusCode: 200, headers, body: rawResult };

  } catch (err) {
    console.error("[data.js] GitHub error:", err.message);
    // Return error info + default so client knows what happened
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...DEFAULT_TOUR,
        _source: "fallback",
        _error: err.message,
        _repo: REPO
      })
    };
  }
};

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "GET",
      headers: {
        "User-Agent": "tour-app/1.0",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    }, (res) => {
      let d = "";
      res.on("data", function(c) { d += c; });
      res.on("end", function() {
        if (res.statusCode >= 400) return reject(new Error("HTTP " + res.statusCode));
        resolve(d);
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, function() { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

function ghGet(path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.github.com",
      path: path,
      method: "GET",
      headers: {
        "User-Agent": "tour-app/1.0",
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    }, (res) => {
      let d = "";
      res.on("data", function(c) { d += c; });
      res.on("end", function() {
        try {
          const parsed = JSON.parse(d);
          if (res.statusCode >= 400) {
            return reject(new Error("GitHub HTTP " + res.statusCode + ": " + (parsed.message || "unknown")));
          }
          resolve(parsed);
        } catch(e) {
          reject(new Error("Parse error: " + d.slice(0, 100)));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, function() { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}
