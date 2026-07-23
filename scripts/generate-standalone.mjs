import { readFile, writeFile } from "node:fs/promises";

const source = await readFile("szafki.jsx", "utf8");
const safeSource = source.replaceAll("</script", "<\\/script");

const html = `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MebloProjekt — podgląd standalone</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  </head>
  <body>
    <div id="root">
      <div style="padding:24px;font-family:system-ui,sans-serif;color:#444">
        Ładowanie podglądu MebloProjekt…
      </div>
    </div>
    <script type="text/plain" id="app-source">${safeSource}</script>
    <script>
      (function bootStandalonePreview() {
        const root = document.getElementById("root");

        function escapeHtml(value) {
          return String(value).replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
        }

        function showError(error) {
          root.innerHTML = ` + "`" + `
            <main style="padding:24px;font-family:system-ui,sans-serif;max-width:900px;margin:auto">
              <h1 style="font-size:24px;font-weight:700;color:#991b1b">Nie udało się uruchomić podglądu</h1>
              <p>Ten plik działa po pobraniu na komputer i otwarciu w przeglądarce. Wymaga dostępu do CDN dla React, Babel i Tailwind.</p>
              <pre style="margin-top:16px;background:#fee2e2;color:#7f1d1d;padding:12px;border-radius:8px;white-space:pre-wrap">\${escapeHtml(error && (error.stack || error.message || error))}</pre>
            </main>` + "`" + `;
        }

        try {
          const source = document.getElementById("app-source").textContent;
          const previewSource = source
            .replace(/import React, \\{([^}]+)\\} from ["']react["'];/, "const {$1} = React;")
            .replace(/export default function App\\s*\\(/, "function App(")
            + ` + "`" + `\\n\\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));` + "`" + `;

          const compiled = Babel.transform(previewSource, {
            presets: [["react", { runtime: "classic" }]],
            filename: "szafki.jsx",
          }).code;

          new Function("React", "ReactDOM", compiled)(React, ReactDOM);
        } catch (error) {
          showError(error);
        }
      })();
    </script>
  </body>
</html>
`;

await writeFile("standalone.html", html);
