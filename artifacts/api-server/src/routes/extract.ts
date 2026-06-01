import { Router } from "express";
import { ExtractEmbedsBody } from "@workspace/api-zod";

const router = Router();

// ── Platform helpers ──────────────────────────────────────────────────────────

function detectPlatform(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("vimeo.com")) return "Vimeo";
    if (host.includes("twitch.tv")) return "Twitch";
    if (host.includes("dailymotion.com")) return "Dailymotion";
    if (host.includes("facebook.com")) return "Facebook";
    if (host.includes("tiktok.com")) return "TikTok";
    if (host.includes("twitter.com") || host.includes("x.com")) return "X";
    if (host.includes("rumble.com")) return "Rumble";
    if (host.includes("odysee.com")) return "Odysee";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("archive.org")) return "Internet Archive";
    if (host.includes("drive.google.com")) return "Google Drive";
  } catch { /* ignore */ }
  return null;
}

function buildKnownEmbed(url: string): { embedCode: string; source: string; thumbnail?: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      let videoId: string | null = null;
      if (host.includes("youtu.be")) {
        videoId = u.pathname.slice(1).split("?")[0];
      } else {
        videoId = u.searchParams.get("v");
        if (!videoId) {
          const m = u.pathname.match(/\/embed\/([^/?]+)/);
          if (m) videoId = m[1];
        }
      }
      if (videoId) {
        return {
          source: "YouTube",
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          embedCode: `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
        };
      }
    }

    if (host.includes("vimeo.com")) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) {
        return {
          source: "Vimeo",
          embedCode: `<iframe src="https://player.vimeo.com/video/${m[1]}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`,
        };
      }
    }

    if (host.includes("dailymotion.com")) {
      const m = u.pathname.match(/\/video\/([^_]+)/);
      if (m) {
        return {
          source: "Dailymotion",
          embedCode: `<iframe frameborder="0" width="640" height="360" src="https://www.dailymotion.com/embed/video/${m[1]}" allowfullscreen></iframe>`,
        };
      }
    }

    if (host.includes("twitch.tv")) {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length === 1) {
        return {
          source: "Twitch",
          embedCode: `<iframe src="https://player.twitch.tv/?channel=${parts[0]}&parent=localhost" frameborder="0" allowfullscreen width="640" height="360"></iframe>`,
        };
      }
    }

    if (host.includes("rumble.com")) {
      const m = u.pathname.match(/\/embed\/([^/]+)/);
      if (m) {
        return {
          source: "Rumble",
          embedCode: `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/${m[1]}/" frameborder="0" allowfullscreen></iframe>`,
        };
      }
    }
  } catch { /* ignore */ }
  return null;
}

// ── Video URL detection ───────────────────────────────────────────────────────

const VIDEO_EXT = /\.(mp4|webm|mkv|ogv|avi|mov|flv|ts)(\?.*)?$/i;
const STREAM_EXT = /\.(m3u8|mpd)(\?.*)?$/i;

function isEmbeddableIframeUrl(src: string): boolean {
  try {
    const host = new URL(src).hostname.replace("www.", "");
    // Known video/embed hostnames that work inside iframes
    const knownHosts = [
      "youtube.com", "youtu.be", "vimeo.com", "twitch.tv", "dailymotion.com",
      "rumble.com", "odysee.com", "drive.google.com", "archive.org",
      "player.", "embed.", "stream.", "watch.", "video.",
    ];
    return knownHosts.some((h) => host.includes(h));
  } catch { return false; }
}

function buildVideoEmbed(url: string, title?: string): string {
  if (STREAM_EXT.test(url)) {
    // HLS / DASH — use a video tag; note that HLS needs JS in some browsers
    return `<video controls width="100%" style="width:100%;height:100%;background:#000;" src="${url}" title="${title ?? ""}">
  <source src="${url}" type="application/x-mpegURL">
  Your browser does not support HLS video.
</video>`;
  }
  return `<video controls width="100%" style="width:100%;height:100%;background:#000;" src="${url}" title="${title ?? ""}">
  <source src="${url}">
  Your browser does not support this video format.
</video>`;
}

// ── HTML Parsers ──────────────────────────────────────────────────────────────

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!m) return "";
  return m[1].trim()
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

/**
 * Extract `<iframe src="...">` tags from HTML, skipping tiny tracking ones.
 */
function extractIframeEmbeds(html: string, pageUrl: string): Array<{ title: string; url: string; embedCode: string; source?: string }> {
  const results: Array<{ title: string; url: string; embedCode: string; source?: string }> = [];
  const iframeRe = /<iframe[^>]*src=["']([^"']+)["'][^>]*(?:><\/iframe>|\/?>)/gi;
  const srcRe = /src=["']([^"']+)["']/i;

  for (const match of html.matchAll(iframeRe)) {
    const tag = match[0];
    const srcMatch = tag.match(srcRe);
    if (!srcMatch) continue;
    let src = srcMatch[1];

    // Skip tiny tracking/ads iframes
    const wMatch = tag.match(/width=["']?(\d+)/i);
    const hMatch = tag.match(/height=["']?(\d+)/i);
    if (wMatch && Number(wMatch[1]) < 100) continue;
    if (hMatch && Number(hMatch[1]) < 100) continue;

    // Make absolute
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) {
      try { src = new URL(pageUrl).origin + src; } catch { continue; }
    }

    const cleanTag = tag.replace(srcMatch[1], src);
    results.push({ title: "", url: src, embedCode: cleanTag, source: detectPlatform(src) ?? undefined });
  }
  return results;
}

/**
 * Extract `<video src="...">` and `<source src="...">` tags.
 */
function extractVideoTags(html: string): Array<{ title: string; url: string; embedCode: string; source?: string }> {
  const results: Array<{ title: string; url: string; embedCode: string; source?: string }> = [];
  const re = /<(?:video|source)[^>]+src=["']([^"']+)["'][^>]*>/gi;
  for (const m of html.matchAll(re)) {
    const src = m[1];
    if (!VIDEO_EXT.test(src) && !STREAM_EXT.test(src)) continue;
    results.push({ title: "", url: src, embedCode: buildVideoEmbed(src), source: detectPlatform(src) ?? undefined });
  }
  return results;
}

/**
 * Extract JS object entries of the form:
 *   { name: "...", url: "..." }
 *   { label: "...", url: "..." }
 *   { title: "...", url: "..." }
 *   { ep: "...", url: "..." }
 * where `url` is a video/stream file or an embeddable iframe URL.
 */
function extractJsVideoEntries(html: string): Array<{ title: string; url: string; embedCode: string; source?: string }> {
  const results: Array<{ title: string; url: string; embedCode: string; source?: string }> = [];
  const seen = new Set<string>();

  // Match any JS object-like entry containing a name/label/title/ep key and a url key
  const objectRe = /\{[^{}]*?(?:name|label|title|ep)\s*:\s*["']([^"']+)["'][^{}]*?url\s*:\s*["']([^"']+)["'][^{}]*?\}/gi;
  for (const m of html.matchAll(objectRe)) {
    const name = m[1].trim();
    const url = m[2].trim();
    if (seen.has(url)) continue;
    if (!VIDEO_EXT.test(url) && !STREAM_EXT.test(url) && !isEmbeddableIframeUrl(url)) continue;
    seen.add(url);
    const source = detectPlatform(url) ?? undefined;
    const embedCode = VIDEO_EXT.test(url) || STREAM_EXT.test(url)
      ? buildVideoEmbed(url, name)
      : `<iframe src="${url}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;
    results.push({ title: name, url, embedCode, source });
  }

  // Also try reversed: url first, then name/label/title
  const reversedRe = /\{[^{}]*?url\s*:\s*["']([^"']+)["'][^{}]*?(?:name|label|title|ep)\s*:\s*["']([^"']+)["'][^{}]*?\}/gi;
  for (const m of html.matchAll(reversedRe)) {
    const url = m[1].trim();
    const name = m[2].trim();
    if (seen.has(url)) continue;
    if (!VIDEO_EXT.test(url) && !STREAM_EXT.test(url) && !isEmbeddableIframeUrl(url)) continue;
    seen.add(url);
    const source = detectPlatform(url) ?? undefined;
    const embedCode = VIDEO_EXT.test(url) || STREAM_EXT.test(url)
      ? buildVideoEmbed(url, name)
      : `<iframe src="${url}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;
    results.push({ title: name, url, embedCode, source });
  }

  return results;
}

/**
 * Extract bare video URLs from script tags (no surrounding object).
 */
function extractBareVideoUrls(html: string): Array<{ title: string; url: string; embedCode: string; source?: string }> {
  const results: Array<{ title: string; url: string; embedCode: string; source?: string }> = [];
  const seen = new Set<string>();
  const re = /["'](https?:\/\/[^"']+\.(?:mp4|m3u8|webm|mkv|mpd)(?:\?[^"']*)?)['"]/gi;
  for (const m of html.matchAll(re)) {
    const url = m[1];
    if (seen.has(url)) continue;
    seen.add(url);
    results.push({ title: "", url, embedCode: buildVideoEmbed(url), source: detectPlatform(url) ?? undefined });
  }
  return results;
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post("/extract", async (req, res) => {
  const body = ExtractEmbedsBody.parse(req.body);
  const rawUrl = body.url.trim();
  const pageUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

  // 1. Known-platform shortcut (YouTube, Vimeo, etc.)
  const known = buildKnownEmbed(pageUrl);
  if (known) {
    let title = detectPlatform(pageUrl) + " Video";
    try { title = new URL(pageUrl).hostname.replace("www.", "") + new URL(pageUrl).pathname; } catch { /* ignore */ }
    res.json({
      url: pageUrl,
      pageTitle: title,
      embeds: [{ title, url: pageUrl, embedCode: known.embedCode, source: known.source, thumbnail: known.thumbnail }],
    });
    return;
  }

  // 2. Fetch page HTML
  let html: string;
  try {
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });
    html = await response.text();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(422).json({ error: `Failed to fetch URL: ${message}` });
    return;
  }

  const pageTitle = extractTitle(html);

  // 3. Collect embeds — JS entries first (most specific), then iframes, then video tags, then bare URLs
  const seen = new Set<string>();
  const allEmbeds: Array<{ title: string; url: string; embedCode: string; source?: string; thumbnail?: string }> = [];

  const add = (items: Array<{ title: string; url: string; embedCode: string; source?: string; thumbnail?: string }>) => {
    for (const item of items) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        allEmbeds.push(item);
      }
    }
  };

  add(extractJsVideoEntries(html));
  add(extractIframeEmbeds(html, pageUrl));
  add(extractVideoTags(html));
  // Only add bare video URLs if we found nothing else (avoids duplicates)
  if (allEmbeds.length === 0) {
    add(extractBareVideoUrls(html));
  }

  res.json({ url: pageUrl, pageTitle, embeds: allEmbeds });
});

export default router;
