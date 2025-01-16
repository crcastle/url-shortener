import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const schema = z.object({
  url: z.string().url(),
});
  
export const validator = zValidator('form', schema, (result, c) => {
  if (!result.success) {
    return c.render(
      <div>
        <h2>Error!</h2>
        <a href="/">Back</a>
      </div>
    );
  }
});
