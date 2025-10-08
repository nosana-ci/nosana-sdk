import createClient, { Middleware } from 'openapi-fetch';

import { AuthenticatedPaths, AuthenticatedClient } from '../../../types/utils.js';
import { paths } from "./schema.js"

export type * from './schema.d.ts';
export type NosanaAPIQueryClient = AuthenticatedClient<paths>;

export const createNosanaAPIClient = (
  baseUrl: string,
  apiKey: string | undefined,
): NosanaAPIQueryClient => {
  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      if (!apiKey) {
        throw new Error('API key is required for authenticated requests');
      }
      request.headers.set('Authorization', `Bearer ${apiKey}`);
      request.headers.set("Content-Type", "application/json");
    },
  };

  const baseClient = createClient<AuthenticatedPaths<paths>>({ baseUrl });

  baseClient.use(authMiddleware);

  return baseClient;
};
