import { Router } from "express";
import { ExtractEmbedsBody } from "@workspace/api-zod";

const router = Router();

function detectPlatform(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
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
  } catch {
    // ignore
  }
  return null;
}

function buildKnownEmbed(url: string): { embedCode: string; source: string; thumbnail?: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");

    // YouTube
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

    // Vimeo
    if (host.includes("vimeo.com")) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) {
        return {
          source: "Vimeo",
          embedCode: `<iframe src="https://player.vimeo.com/video/${m[1]}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`,
        };
      }
    }

    // Dailymotion
    if (host.includes("dailymotion.com")) {
      const m = u.pathname.match(/\/video\/([^_]+)/);
      if (m) {
        return {
          source: "Dailymotion",
          embedCode: `<iframe frameborder="0" width="640" height="360" src="https://www.dailymotion.com/embed/video/${m[1]}" allowfullscreen></iframe>`,
        };
      }
    }

    // Twitch channel
    if (host.includes("twitch.tv")) {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length === 1) {
        return {
          source: "Twitch",
          embedCode: `<iframe src="https://player.twitch.tv/?channel=${parts[0]}&parent=localhost" frameborder="0" allowfullscreen width="640" height="360"></iframe>`,
        };
      }
    }

    // Rumble
    if (host.includes("rumble.com")) {
      const m = u.pathname.match(/\/embed\/([^/]+)/);
      if (m) {
        return {
          source: "Rumble",
          embedCode: `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/${m[1]}/" frameborder="0" allowfullscreen></iframe>`,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"') : "";
}

function extractIframes(html: string, pageUrl: string): Array<{ embedCode: string; src: string }> {
  const results: Array<{ embedCode: string; src: string }> = [];
  const iframeRe = /<iframe[^>]*src=["']([^"']+)["'][^>]*>.*?<\/iframe>|<iframe[^>]*src=["']([^"']+)["'][^>]*\/?>|<iframe[^>]*/gi;
  const srcRe = /src=["']([^"']+)["']/i;

  const raw = html.matchAll(/<iframe[^>]*(?:src=["'][^"']+["'])[^>]*(?:><\/iframe>|\/?>)/gi);
  for (const match of raw) {
    const tag = match[0];
    const srcMatch = tag.match(srcRe);
    if (!srcMatch) continue;
    let src = srcMatch[1];
    // Skip tiny tracking iframes
    const wMatch = tag.match(/width=["']?(\d+)/i);
    const hMatch = tag.match(/height=["']?(\d+)/i);
    if (wMatch && Number(wMatch[1]) < 100) continue;
    if (hMatch && Number(hMatch[1]) < 100) continue;
    // Make absolute URL
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) {
      try {
        const base = new URL(pageUrl);
        src = base.origin + src;
      } catch { continue; }
    }
    // Reconstruct clean embed code ensuring src is full URL
    const cleanTag = tag.replace(srcMatch[1], src);
    results.push({ embedCode: cleanTag, src });
  }
  return results;
}

router.post("/extract", async (req, res) => {
  const body = ExtractEmbedBody.parse(req.body);
  const rawUrl = body.url.trim();

  // Normalise URL
  const pageUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

  // Try known-platform shortcut first
  const known = buildKnownEmbed(pageUrl);
  if (known) {
    const platform = detectPlatform(pageUrl) ?? "Unknown";
    let title = platform + " Video";
    try {
      const u = new URL(pageUrl);
      title = u.hostname.replace("www.", "") + u.pathname;
    } catch { /* ignore */ }
    res.json({
      url: pageUrl,
      pageTitle: title,
      embeds: [
        {
          title,
          url: pageUrl,
          embedCode: known.embedCode,
          source: known.source,
          thumbnail: known.thumbnail,
        },
      ],
    });
    return;
  }

  // Generic fetch + parse
  let html: string;
  try {
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    html = await response.text();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(422).json({ error: `Failed to fetch URL: ${message}` });
    return;
  }

  const pageTitle = extractTitle(html);
  const iframes = extractIframes(html, pageUrl);

  const embeds = iframes.map(({ embedCode, src }) => {
    const source = detectPlatform(src);
    return {
      title: pageTitle || src,
      url: src,
      embedCode,
      source: source ?? undefined,
    };
  });

  res.json({ url: pageUrl, pageTitle, embeds });
});

export default router;
