import { renderApiReference } from "@scalar/client-side-rendering"

const mermaidScript = `
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"><\/script>
<script>
(function () {
  function init() {
    if (typeof mermaid === 'undefined') return setTimeout(init, 100);
    var isDark = document.body.classList.contains('dark-mode');
    mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'neutral' });

    function tryRender(pre) {
      if (pre.dataset.mermaidDone) return;
      var code = pre.querySelector('code.language-mermaid');
      if (!code) return;
      pre.dataset.mermaidDone = '1';
      var id = 'mermaid-' + Math.random().toString(36).slice(2);
      mermaid.render(id, code.textContent || '').then(function (r) {
        var div = document.createElement('div');
        div.style.cssText = 'overflow:auto;margin:1rem 0';
        div.innerHTML = r.svg;
        pre.replaceWith(div);
      }).catch(function () { pre.dataset.mermaidDone = ''; });
    }

    var ob = new MutationObserver(function () {
      document.querySelectorAll('pre:has(code.language-mermaid)').forEach(tryRender);
    });
    ob.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('pre:has(code.language-mermaid)').forEach(tryRender);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
<\/script>
`

export async function GET() {
  const html = renderApiReference({
    config: { url: "/api/docs/openapi.json" },
    pageTitle: "Scraper API Reference",
  })

  const injected = html.replace("</body>", mermaidScript + "</body>")

  return new Response(injected, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
