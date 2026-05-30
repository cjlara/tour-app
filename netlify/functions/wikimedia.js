// wikimedia.js — searches Wikimedia Commons for photos of an attraction
const https = require("https");

exports.handler = async function (event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-token",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
  const json = (code, obj) => ({
    statusCode: code,
    headers: { ...cors, "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  });

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };

  const q = event.queryStringParameters || {};
  const query = q.query || q.name;
  if (!query) return json(400, { error: "Missing ?query=" });

  try {
    const photos = await searchWikimedia(query);
    return json(200, { ok: true, photos });
  } catch (err) {
    return json(500, { error: err.message });
  }
};

async function searchWikimedia(query) {
  // Search Wikimedia Commons for images matching the query
  const searchUrl = "https://commons.wikimedia.org/w/api.php?" + [
    "action=query",
    "generator=search",
    "gsrnamespace=6",
    "gsrsearch=" + encodeURIComponent(query),
    "gsrlimit=12",
    "prop=imageinfo",
    "iiprop=url|size|extmetadata",
    "iiurlwidth=960",
    "format=json",
    "origin=*"
  ].join("&");

  const data = await httpGet(searchUrl);
  const pages = (data.query && data.query.pages) ? Object.values(data.query.pages) : [];

  const photos = [];
  for (const page of pages) {
    const info = page.imageinfo && page.imageinfo[0];
    if (!info) continue;

    // Only JPEGs and PNGs, skip SVG/small images
    const url = info.url || "";
    if (!url.match(/\.(jpg|jpeg|png)$/i)) continue;
    if (info.width < 400 || info.height < 300) continue;

    // Get thumbnail URL (960px wide)
    const thumbUrl = info.thumburl || url;

    // Get title/description
    const meta = info.extmetadata || {};
    const desc = (meta.ImageDescription && meta.ImageDescription.value || "")
      .replace(/<[^>]+>/g, "").trim().slice(0, 100);

    photos.push({
      url: thumbUrl,
      fullUrl: url,
      title: page.title.replace("File:", ""),
      description: desc,
      width: info.thumbwidth || info.width,
      height: info.thumbheight || info.height,
    });

    if (photos.length >= 8) break;
  }

  return photos;
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        "User-Agent": "TourApp/1.0 (educational project)",
        "Accept": "application/json",
      }
    };
    https.get(url, opts, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error("Parse error")); }
      });
    }).on("error", reject)
      .setTimeout(10000, function () { this.destroy(); reject(new Error("Timeout")); });
  });
}
