import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { keyRegex } from './cloudflare';

const schema = z.object({
  url: z.string().url(),
  userProvidedKey: z.union([
    z.string().regex(new RegExp(keyRegex), "Invalid short link characters"),
    z.literal(''),
  ]),
});
  
export const validator = zValidator('form', schema, (result, c) => {
  if (!result.success) {
    console.log(result.error);
    return c.render(
      <div>
        <h2>Error</h2>
        <ul>
          {result.error.issues.map((issue) => (
            <li>{issue.message}</li>
          ))}
        </ul>
        <a href="/">Back</a>
      </div>
    );
  }
});
