import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const validCharsRegex = new RegExp(/^[a-zA-Z0-9_-]+$/);

const schema = z.object({
  url: z.string().url(),
  userProvidedKey: z
    .string()
    .regex(
      validCharsRegex,
      "Use only letters, digits, underscores, or hyphens in short link slug."
    )
    .optional()
    .or(z.literal("")),
});

export const htmlFormValidator = zValidator("form", schema, (result, c) => {
  if (!result.success) {
    return c.html(
      <blockquote style="background-color: color-mix(in srgb, red 10%, transparent); border-left: 5px solid color-mix(in srgb, red 20%, transparent)">
        Error(s):
        <ul>
          {result.error.issues.map((issue) => (
            <li>{issue.message}</li>
          ))}
        </ul>
      </blockquote>,
      400
    );
  }
});

export const jsonValidator = zValidator("json", schema, (result, c) => {
  if (!result.success) {
    return c.json(
      {
        ok: false,
        details: result.error.issues,
      },
      400
    );
  }
});
