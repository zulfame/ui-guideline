const { createProxyMiddleware } = require("http-proxy-middleware");

// Expose the backend's dynamic SEO endpoints at the root paths that crawlers
// expect (/robots.txt, /sitemap.xml). The backend serves them under /api.
module.exports = function (app) {
  app.use(
    ["/robots.txt", "/sitemap.xml"],
    createProxyMiddleware({
      target: process.env.REACT_APP_BACKEND_URL || "http://localhost:8001",
      changeOrigin: true,
      pathRewrite: {
        "^/robots.txt": "/api/robots.txt",
        "^/sitemap.xml": "/api/sitemap.xml",
      },
    }),
  );
};
