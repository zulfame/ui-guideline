/* eslint-disable no-console */
/**
 * Post-build SEO/Open-Graph injector.
 *
 * Fetches the live Branding settings from the backend and rewrites the
 * <title> + the block between the BRANDING_META markers inside build/index.html.
 * This keeps social link-previews (WhatsApp/FB/Twitter) in sync with Branding
 * on every deploy — no manual index.html edits when branding changes.
 *
 * Fails soft: if the API is unreachable, it keeps the static fallback that was
 * copied from public/index.html so the build never breaks.
 *
 * Runs automatically as the "postbuild" npm script.
 */
const fs = require("fs");
const path = require("path");

const BACKEND = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
const INDEX = path.resolve(__dirname, "..", "build", "index.html");
const START = "<!-- BRANDING_META:START";
const END = "<!-- BRANDING_META:END -->";

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function absolutize(url, base) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${base.replace(/\/+$/, "")}/${String(url).replace(/^\/+/, "")}`;
}

async function main() {
  if (!fs.existsSync(INDEX)) {
    console.warn("[inject-og] build/index.html not found — skipping.");
    return;
  }
  if (!BACKEND) {
    console.warn("[inject-og] REACT_APP_BACKEND_URL not set — keeping static meta.");
    return;
  }

  let data;
  try {
    const res = await fetch(`${BACKEND}/api/branding`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    console.warn(`[inject-og] Could not fetch branding (${e.message}) — keeping static meta.`);
    return;
  }

  const canonical = data.canonical_url || data.site_url || "";
  const imgPath = data.assets && data.assets.og_image && data.assets.og_image.url;
  // OG image must be absolute; prefer the public canonical domain.
  const ogImage = absolutize(imgPath, canonical || BACKEND);
  const title = data.og_title || data.app_name || "";
  const description = data.og_description || data.meta_description || "";
  const siteName = data.app_name || "";
  const keywords = data.meta_keywords || "";
  const robots = data.allow_indexing ? "index, follow" : "noindex, nofollow";

  const lines = [
    `<!-- BRANDING_META:START (auto-generated at build by scripts/inject-og.js) -->`,
    description && `<meta name="description" content="${esc(description)}" />`,
    keywords && `<meta name="keywords" content="${esc(keywords)}" />`,
    `<meta name="robots" content="${robots}" />`,
    canonical && `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    siteName && `<meta property="og:site_name" content="${esc(siteName)}" />`,
    title && `<meta property="og:title" content="${esc(title)}" />`,
    description && `<meta property="og:description" content="${esc(description)}" />`,
    canonical && `<meta property="og:url" content="${esc(canonical)}" />`,
    ogImage && `<meta property="og:image" content="${esc(ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    title && `<meta name="twitter:title" content="${esc(title)}" />`,
    description && `<meta name="twitter:description" content="${esc(description)}" />`,
    ogImage && `<meta name="twitter:image" content="${esc(ogImage)}" />`,
    `<!-- BRANDING_META:END -->`,
  ].filter(Boolean);

  const block = lines.join("\n        ");

  let html = fs.readFileSync(INDEX, "utf8");

  const startIdx = html.indexOf(START);
  const endIdx = html.indexOf(END);
  if (startIdx !== -1 && endIdx !== -1) {
    html = html.slice(0, startIdx) + block + html.slice(endIdx + END.length);
  } else {
    // No markers (unexpected) — inject before </head>.
    html = html.replace("</head>", `        ${block}\n    </head>`);
  }

  if (title) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  }

  fs.writeFileSync(INDEX, html, "utf8");
  console.log(`[inject-og] Injected branding meta (title="${title}", image=${ogImage || "none"}).`);
}

main();
