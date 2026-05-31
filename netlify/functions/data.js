// data.js — serves tour.json fresh from GitHub (no Netlify static cache)
const https = require("https");

const REPO   = process.env.GITHUB_REPO   || "";
const GTOKEN = process.env.GITHUB_TOKEN  || "";
const BRANCH = process.env.GITHUB_BRANCH || "main";

exports.handler = async function (event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (!REPO || !GTOKEN) {
    // Fallback: serve the bundled tour.json
    const fs = require("fs");
    const path = require("path");
    try {
      const local = fs.readFileSync(path.join(__dirname, "../../data/tour.json"), "utf8");
      return { statusCode: 200, headers: cors, body: local };
    } catch(e) {
      return { statusCode: 404, headers: cors, body: JSON.stringify({error: "tour.json not found"}) };
    }
  }

  try {
    const result = await ghGet("/repos/" + REPO + "/contents/data/tour.json?ref=" + BRANCH);
    // GitHub returns file content as base64
    const content = Buffer.from(result.content.replace(/\n/g, ""), "base64").toString("utf8");
    return { statusCode: 200, headers: cors, body: content };
  } catch (err) {
    // Fallback to static file
    try {
      const fs = require("fs"), path = require("path");
      const local = fs.readFileSync(path.join(__dirname, "../../data/tour.json"), "utf8");
      return { statusCode: 200, headers: cors, body: local };
    } catch(e2) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({error: err.message}) };
    }
  }
};

function ghGet(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path,
      method: "GET",
      headers: {
        "User-Agent": "tour-app",
        "Authorization": "Bearer " + GTOKEN,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
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
        } catch(e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}
