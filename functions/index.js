const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

function encodeColorsCompact(hexParts) {
  if (!hexParts || hexParts.length === 0) return "";
  const bytes = hexParts.map((h) => parseInt(h, 16));
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildOgHtml(docId, pattern, origin) {
  const imageUrl = `${origin}/img/${docId}`;
  const encodedColors = encodeColorsCompact(pattern.colors);
  const simulatorUrl = `${origin}/s?t=${encodeURIComponent(pattern.templateId)}&c=${encodedColors}&k=${pattern.patternKey}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pattern.name} — Palzzi</title>
<meta property="og:type" content="article">
<meta property="og:title" content="${pattern.name}">
<meta property="og:description" content="Palzzi 쿠미히모 팔찌 패턴 — 시뮬레이터에서 열어보세요!">
<meta property="og:image" content="${imageUrl}">
<meta property="og:url" content="${origin}/og/${docId}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${pattern.name}">
<meta name="twitter:image" content="${imageUrl}">
<link rel="icon" href="/favicon.ico">
<style>
body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa}
.card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.1);text-align:center;max-width:360px}
.card img{width:320px;height:200px;object-fit:cover;border-radius:8px}
.card h2{margin:16px 0 8px;font-size:18px;color:#333}
.card a{display:inline-block;margin-top:12px;padding:10px 24px;background:#2a9d8f;color:#fff;text-decoration:none;border-radius:8px;font-weight:600}
.card a:hover{opacity:.9}
</style>
</head>
<body>
<div class="card">
<img src="${imageUrl}" alt="${pattern.name}">
<h2>${pattern.name}</h2>
<a href="${simulatorUrl}">시뮬레이터에서 열기 →</a>
</div>
</body>
</html>`;
}

// Dynamic OG page: /og/:docId
exports.og = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    const match = req.path.match(/^\/og\/([A-Za-z0-9]+)$/);
    if (!match) {
      res.redirect(302, "https://palzzilab.web.app/");
      return;
    }

    const docId = match[1];
    const origin = `${req.protocol}://${req.get("host")}`;

    try {
      const docSnap = await db.collection("patterns").doc(docId).get();
      if (!docSnap.exists) {
        res.status(404).send("Pattern not found");
        return;
      }

      const f = docSnap.data();
      const pattern = {
        name: f.nameKo || f.templateName || "Palzzi Pattern",
        templateId: f.templateId || "",
        patternKey: f.patternKey || "",
        colors: (f.colors || []).map((c) => c.replace("#", "")),
      };

      res.set("Content-Type", "text/html; charset=utf-8");
      res.send(buildOgHtml(docId, pattern, origin));
    } catch (err) {
      console.error("OG function error:", err);
      res.status(500).send("Internal error");
    }
  }
);

// Dynamic image serving: /img/:docId
// Reads snapshotBase64 from Firestore and returns JPEG
exports.img = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    const match = req.path.match(/^\/img\/([A-Za-z0-9]+)$/);
    if (!match) {
      res.status(400).send("Bad request");
      return;
    }

    const docId = match[1];

    try {
      const docSnap = await db.collection("patterns").doc(docId).get();
      if (!docSnap.exists || !docSnap.data().snapshotBase64) {
        // Fallback: serve default logo
        res.redirect(302, "/palzzi_logo.png");
        return;
      }

      const b64 = docSnap.data().snapshotBase64;
      const base64Data = b64.includes(",") ? b64.split(",")[1] : b64;
      const buffer = Buffer.from(base64Data, "base64");

      res.set("Content-Type", "image/jpeg");
      res.set("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (err) {
      console.error("Image function error:", err);
      res.redirect(302, "/palzzi_logo.png");
    }
  }
);
