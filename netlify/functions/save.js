// save.js — saves tour.json to GitHub repo
const https = require("https");

const REPO   = process.env.GITHUB_REPO   || "";
const GTOKEN = process.env.GITHUB_TOKEN  || "";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const PATH   = "data/tour.json";

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

  if (!REPO || !GTOKEN) return json(500, {
    error: "Falta GITHUB_TOKEN o GITHUB_REPO en las variables de entorno de Netlify"
  });

  let body;
  try { body = JSON.parse(event.body); } catch { return json(400, { error: "JSON inválido" }); }

  const { tourData } = body;
  if (!tourData) return json(400, { error: "Falta tourData" });

  try {
    // Get current file SHA (needed to update)
    let sha = null;
    try {
      const info = await ghRequest("GET", "/repos/" + REPO + "/contents/" + PATH + "?ref=" + BRANCH, null);
      sha = info.sha;
    } catch (e) {
      if (e.status !== 404) throw e;
      // File doesn't exist yet — will create it
    }

    const content = Buffer.from(JSON.stringify(tourData, null, 2)).toString("base64");
    const payload = {
      message: "Update tour data — " + new Date().toISOString().slice(0, 16).replace("T", " "),
      content,
      branch: BRANCH,
    };
    if (sha) payload.sha = sha;

    await ghRequest("PUT", "/repos/" + REPO + "/contents/" + PATH, payload);
    return json(200, { ok: true, saved: PATH });

  } catch (err) {
    return json(500, { error: err.message });
  }
};

function ghRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "api.github.com",
      path,
      method,
      headers: {
        "User-Agent": "tour-app",
        "Authorization": "Bearer " + GTOKEN,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
    };
    if (payload) opts.headers["Content-Length"] = Buffer.byteLength(payload);
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(d);
          if (res.statusCode >= 400) {
            const err = new Error(parsed.message || "GitHub " + res.statusCode);
            err.status = res.statusCode;
            return reject(err);
          }
          resolve(parsed);
        } catch (e) {
          if (res.statusCode >= 400) return reject(new Error("HTTP " + res.statusCode));
          resolve({});
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout")); });
    if (payload) req.write(payload);
    req.end();
  });
}
