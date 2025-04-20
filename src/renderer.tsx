import { jsxRenderer } from "hono/jsx-renderer";
import { css, Style } from "hono/css";

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <link rel="stylesheet" href="/assets/pico.min.css" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/assets/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/assets/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/assets/favicon-16x16.png"
        />
        <link rel="manifest" href="/assets/site.webmanifest" />
        <script
          src="https://unpkg.com/htmx.org@2.0.4"
          integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+"
          crossorigin="anonymous"
        ></script>
        <script
          src="https://unpkg.com/htmx-ext-response-targets@2.0.3"
          crossorigin="anonymous"
        ></script>
        <Style>{css`
          div.panel {
            text-align: right;
            font-family: "Lucida Console", Courier, monospaced;
            padding: 0 18px;
            max-height: 0;
            overflow: hidden;
          }
          div.panel.active {
            max-height: 200px;
            transition: max-height 0.5s ease-out;
          }
        `}</Style>
      </head>
      <body hx-ext="response-targets">
        <header class="container">
          <h1>
            <a href="/admin" style="text-decoration: none; color: #555;">
              URL Shortener
            </a>
          </h1>
        </header>
        <main class="container">
          <section>
            <div id="notification"></div>
          </section>
          <section>
            <div>{children}</div>
          </section>
        </main>
      </body>
    </html>
  );
});
