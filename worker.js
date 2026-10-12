/**
 * Cloudflare Workers static-site adapter
 * for istanbulboyacilik.com.
 *
 * Existing SEO URLs are preserved:
 * /                  -> /index.html
 * /kadikoy/          -> /kadikoy/index.html
 * /bloglar/post.html -> /bloglar/post.html
 */

const CANONICAL_HOST = "istanbulboyacilik.com";

const LEGACY_REDIRECTS = new Map([
  [
    "/bloglar/villa-boyama-fiyatlari-2026",
    "/bloglar/villa-boyama-fiyatlari-2026.html"
  ],
  [
    "/bloglar/boya-neden-catlar-onleme-ve-tamir",
    "/bloglar/boya-neden-catlar-onleme-ve-tamir.html"
  ]
]);

function redirect(requestUrl, pathname) {
  const destination = new URL(requestUrl);
  destination.pathname = pathname;

  return Response.redirect(destination.toString(), 301);
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          Allow: "GET, HEAD"
        }
      });
    }

    const url = new URL(request.url);

    // Redirect www to the canonical domain.
    if (url.hostname === "www." + CANONICAL_HOST) {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    // Preserve legacy redirects.
    const legacyTarget = LEGACY_REDIRECTS.get(url.pathname);

    if (legacyTarget) {
      return redirect(url, legacyTarget);
    }

    // Redirect index.html to its canonical directory URL.
    if (url.pathname === "/index.html") {
      return redirect(url, "/");
    }

    if (url.pathname.endsWith("/index.html")) {
      return redirect(
        url,
        url.pathname.slice(0, -"index.html".length)
      );
    }

    // Keep .html extensions unchanged.
    // Internally rewrite directory URLs to index.html.
    const assetUrl = new URL(url);

    if (assetUrl.pathname.endsWith("/")) {
      assetUrl.pathname += "index.html";
    }

    // Fetch static assets from the dist directory.
    const response = await env.ASSETS.fetch(
      new Request(assetUrl, request)
    );

    const headers = new Headers(response.headers);

    // Security headers.
    headers.set(
      "X-Content-Type-Options",
      "nosniff"
    );

    headers.set(
      "X-Frame-Options",
      "SAMEORIGIN"
    );

    headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );

    // Cache configuration.
    if (/^\/(assets|images|fonts)\//.test(url.pathname)) {
      headers.set(
        "Cache-Control",
        "public, max-age=600, must-revalidate"
      );
    } else {
      headers.set(
        "Cache-Control",
        "public, max-age=0, must-revalidate"
      );
    }

    // Prevent search engines from indexing preview URLs.
    if (url.hostname.endsWith(".workers.dev")) {
      headers.set(
        "X-Robots-Tag",
        "noindex, nofollow"
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
