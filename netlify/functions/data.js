// data.js — serves tour.json
// Reads from GitHub (always fresh) with fallback to static file
const https = require("https");
const fs    = require("fs");
const path  = require("path");

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };

  const REPO   = process.env.GITHUB_REPO   || "";
  const GTOKEN = process.env.GITHUB_TOKEN  || "";
  const BRANCH = process.env.GITHUB_BRANCH || "main";

  // Log env for debugging (remove after confirming)
  console.log("data.js GITHUB_REPO:", REPO || "(not set)");

  // Try GitHub first if configured
  if (REPO && GTOKEN) {
    try {
      const result = await ghGet(
        "https://api.github.com/repos/" + REPO + "/contents/data/tour.json?ref=" + BRANCH,
        GTOKEN
      );
      const decoded = Buffer.from(result.content.replace(/\n/g, ""), "base64").toString("utf8");
      // Validate it's JSON
      JSON.parse(decoded);
      console.log("data.js: served from GitHub repo", REPO);
      return { statusCode: 200, headers, body: decoded };
    } catch (err) {
      console.error("data.js GitHub error:", err.message);
      // Fall through to static file
    }
  }

  // Fallback: static file bundled at deploy time
  try {
    const staticPath = path.join(__dirname, "..", "..", "data", "tour.json");
    const local = fs.readFileSync(staticPath, "utf8");
    console.log("data.js: served from static file");
    return { statusCode: 200, headers, body: local };
  } catch (e) {
    console.error("data.js static fallback failed:", e.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: "tour.json not found. GITHUB_REPO=" + (REPO||"not set"),
        meta: { title: "Tour", subtitle: "", description: "", heroImage: "", videoUrl: "", version: "3.1" },
        days: []
      })
    };
  }
};

function ghGet(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "GET",
      headers: {
        "User-Agent": "tour-app/1.0",
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(d);
          if (res.statusCode >= 400) {
            return reject(new Error("GitHub " + res.statusCode + ": " + (parsed.message || d.slice(0,100))));
          }
          resolve(parsed);
        } catch(e) {
          reject(new Error("JSON parse error: " + d.slice(0, 100)));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}
