import { jsxRenderer } from 'hono/jsx-renderer';
import { css, Style } from 'hono/css';

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="https://fonts.xz.style/serve/inter.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@exampledev/new.css@1.1.2/new.min.css"></link>
        <script src="https://unpkg.com/htmx.org@2.0.4" integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+" crossorigin="anonymous"></script>
        <Style>{css`
          div.panel {
            text-align: right;
            font-family: 'Lucida Console', Courier, monospaced;
            padding: 0 18px;
            max-height: 0;
            overflow: hidden;
          }
          div.panel.active {
            max-height: 200px;
            transition: max-height .5s ease-out;
          }
        `}</Style>
      </head>
      <body>
        <header>
          <h1>
            <a
              href="/"
              style="text-decoration: none; color: #555;"
            >
              URL Shortener - u.crc.io
            </a>
          </h1>
        </header>
        <div>{children}</div>
      </body>
    </html>
  )
});
