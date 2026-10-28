import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { createServer } from "vite";

const outputDir = path.resolve(process.cwd(), "dist/public");
const indexPath = path.join(outputDir, "index.html");
const htmlTemplate = await readFile(indexPath, "utf8");
const rootMarker = '<div id="root"></div>';
if (!htmlTemplate.includes(rootMarker)) throw new Error("Vite HTML root was not found for prerendering.");

const vite = await createServer({
  configFile: path.resolve(process.cwd(), "vite.config.ts"),
  mode: "production",
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});

function addVerification(html: string): string {
  const token = process.env.VITE_GOOGLE_SITE_VERIFICATION?.trim();
  if (!token || token.length > 500 || /[<>"'\s]/.test(token)) return html.replace("<!--SEO_GOOGLE_VERIFICATION-->", "");
  return html.replace("<!--SEO_GOOGLE_VERIFICATION-->", `<meta name="google-site-verification" content="${token}" />`);
}

try {
  const { default: App } = await vite.ssrLoadModule("/src/App.tsx");
  const routes = [
    { path: "/", target: indexPath },
    { path: "/admin", target: path.join(outputDir, "admin.html") },
    { path: "/__not_found__", target: path.join(outputDir, "404.html") },
  ] as const;
  for (const routeInfo of routes) {
    const route = routeInfo.path;
    const appHtml = renderToString(createElement(Router, { ssrPath: route, children: createElement(App) }));
    let html = htmlTemplate.replace(rootMarker, `<div id="root">${appHtml}</div>`);
    html = addVerification(html);
    if (route === "/admin") {
      html = html.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex,nofollow,noarchive" />');
      html = html.replace(/<title>[^<]*<\/title>/, "<title>إدارة مكتب البقمي 2 | دخول الإدارة</title>");
      html = html.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="لوحة إدارة خاصة بمكتب البقمي 2." />');
      html = html.replace(/\s*<link rel="canonical"[^>]*>/, "");
      html = html.replace(/\s*<meta property="og:url"[^>]*>/, "");
    } else if (route === "/__not_found__") {
      html = html.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex,nofollow,noarchive" />');
      html = html.replace(/<title>[^<]*<\/title>/, "<title>الصفحة غير متاحة | مكتب البقمي 2</title>");
      html = html.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="هذه الصفحة غير متاحة. عد إلى قائمة خدمات مكتب البقمي 2." />');
      html = html.replace(/\s*<link rel="canonical"[^>]*>/, "");
      html = html.replace(/\s*<meta property="og:url"[^>]*>/, "");
    }
    await writeFile(routeInfo.target, html, "utf8");
    console.log(`Prerendered ${route} -> ${path.basename(routeInfo.target)}`);
  }
} finally {
  await vite.close();
}
