import { jsxRenderer } from "hono/jsx-renderer";
import { css, Style } from "hono/css";

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
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
        <link rel="stylesheet" href="https://fonts.xz.style/serve/inter.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@exampledev/new.css@1.1.2/new.min.css"
        ></link>
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
        <header>
          <h1>
            <a href="/admin" style="text-decoration: none; color: #555;">
              URL Shortener - crc.is
            </a>
          </h1>
        </header>
        <div id="notification"></div>
        <div>{children}</div>
      </body>
    </html>
  );
});
