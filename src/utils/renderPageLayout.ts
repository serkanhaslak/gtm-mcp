export function renderPageLayout(options: {
  title: string;
  content: string;
  showFooterNav?: boolean;
}): string {
  const { title, content, showFooterNav = true } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow" />
  <link rel="icon" type="image/png" href="https://framerusercontent.com/images/H68mRWTIeftuvGz2dOoClUOfQDc.png">
  <title>${title}</title>
  <style>
    :root {
      --pg-navy: #020617;
      --pg-emerald: #065f46;
      --pg-dark-green: #064e3b;
      --pg-slate: #64748b;
      --pg-light-slate: #f1f5f9;
      --pg-light-mint: #f1fefa;
      --pg-border: #e2e8f0;
      --pg-white: #ffffff;
      --pg-warning-bg: #fff3cd;
      --pg-warning-border: #ffeaa7;
      --pg-warning-text: #856404;
      --pg-radius-card: 10px;
      --pg-radius-pill: 30px;
      --pg-font: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    body {
      display: flex;
      flex-direction: column;
      flex: 1 0 auto;
      font-family: var(--pg-font);
      line-height: 1.7;
      color: var(--pg-navy);
      background: var(--pg-white);
    }

    .site-header {
      border-bottom: 1px solid var(--pg-border);
      background: var(--pg-white);
    }

    .site-header .header-inner {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
    }

    .site-header a {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
    }

    .site-header img {
      height: 32px;
      width: auto;
    }

    main {
      flex: 1;
      max-width: 800px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    h1 {
      color: var(--pg-navy);
      font-size: 1.875rem;
      font-weight: 700;
      margin-bottom: 1rem;
      line-height: 1.3;
    }

    h2 {
      color: var(--pg-navy);
      font-size: 1.375rem;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
    }

    h3 {
      color: var(--pg-slate);
      font-size: 1.125rem;
      font-weight: 600;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }

    p {
      margin-bottom: 1rem;
    }

    a {
      color: var(--pg-emerald);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    strong {
      color: var(--pg-navy);
    }

    ul {
      padding-left: 1.25rem;
      margin-bottom: 1rem;
    }

    li {
      margin-bottom: 0.5rem;
    }

    code {
      background: var(--pg-light-slate);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.9em;
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
    }

    pre {
      background: var(--pg-navy);
      color: var(--pg-border);
      padding: 1.5rem;
      border-radius: var(--pg-radius-card);
      overflow-x: auto;
      margin: 1rem 0;
      line-height: 1.5;
    }

    pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-size: 0.85rem;
    }

    hr {
      border: none;
      height: 1px;
      background: var(--pg-border);
      margin: 2rem 0;
    }

    .highlight {
      background: var(--pg-light-mint);
      border-left: 4px solid var(--pg-emerald);
      padding: 1.25rem;
      margin: 1.5rem 0;
      border-radius: var(--pg-radius-card);
    }

    .highlight h2 {
      margin-top: 0;
    }

    .highlight h3 {
      margin-top: 1rem;
    }

    .warning {
      background: var(--pg-warning-bg);
      border: 1px solid var(--pg-warning-border);
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .warning h3 {
      color: var(--pg-warning-text);
      margin-top: 0;
    }

    .warning p {
      color: var(--pg-warning-text);
      margin-bottom: 0;
    }

    .contact {
      background: var(--pg-light-slate);
      border: 1px solid var(--pg-border);
      padding: 1.5rem;
      border-radius: var(--pg-radius-card);
      margin-top: 2rem;
    }

    .contact h2 {
      margin-top: 0;
    }

    .success {
      background: var(--pg-light-mint);
      border-left: 4px solid var(--pg-emerald);
      padding: 1.5rem;
      border-radius: var(--pg-radius-card);
      margin: 1.5rem 0;
    }

    .section {
      margin-bottom: 1.5rem;
    }

    .site-footer {
      background: var(--pg-navy);
      margin-top: auto;
    }

    .site-footer .footer-inner {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .site-footer img {
      height: 24px;
      width: auto;
    }

    .site-footer nav {
      display: flex;
      gap: 1.5rem;
    }

    .site-footer nav a {
      color: var(--pg-slate);
      font-size: 0.875rem;
      text-decoration: none;
    }

    .site-footer nav a:hover {
      color: var(--pg-white);
    }

    .site-footer .copyright {
      color: var(--pg-slate);
      font-size: 0.8rem;
    }

    @media (max-width: 640px) {
      main {
        padding: 1.5rem 1rem;
      }
      h1 {
        font-size: 1.5rem;
      }
      .site-footer nav {
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }
    }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a href="/">
        <img src="https://framerusercontent.com/images/PtZdSShz63CSFrQM0MH5jBMpn7I.svg" alt="Pragmatic Growth">
      </a>
    </div>
  </header>

  <main>
    ${content}
  </main>

  ${
    showFooterNav
      ? `<footer class="site-footer">
    <div class="footer-inner">
      <img src="https://framerusercontent.com/images/1yjUl4sKzzdaSFzrA6MxoEywY.svg" alt="Pragmatic Growth">
      <nav>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms-of-service">Terms of Service</a>
      </nav>
      <span class="copyright">&copy; ${new Date().getFullYear()} Pragmatic Growth</span>
    </div>
  </footer>`
      : ""
  }
</body>
</html>`;
}
