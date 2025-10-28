import createClient, { Middleware } from 'openapi-fetch';

import { getWallet } from '../utils.js';
import { apiConfigPreset } from '../config.js';
import { AuthorizationManager } from '../services/authorization.js';

import { paths } from './schema.js';

export type * from './schema.d.js';
import { AuthenticatedClient, AuthenticatedPaths } from '../types/utils.js';
import { ClientConfig, Wallet } from '../types/index.js';

export type QueryClient = AuthenticatedClient<paths>;

export function createNosanaApiClient(
  environment: 'devnet' | 'mainnet',
  wallet: Wallet,
  incomingConfig?: Partial<ClientConfig>
): QueryClient {
  const userId = getWallet(wallet).publicKey.toString();
  const authorizationManager = new AuthorizationManager(wallet);

  const { backend_url } = { ...apiConfigPreset[environment], ...incomingConfig?.api };

  const authenticateAllRequests: Middleware = {
    async onRequest({ request }) {
      if (request.body) {
        request.headers.set("Content-Type", "application/json");
      }

      if (incomingConfig?.apiKey) {
        request.headers.set("Authorization", `Bearer ${incomingConfig.apiKey}`);
      } else {
        const authorizationHeader = await authorizationManager.generate(`NosanaApiAuthentication`, {
          includeTime: true
        });

        request.headers.set('x-user-id', userId);
        request.headers.set("Authorization", authorizationHeader);
      }
    }
  }

  const client = createClient<AuthenticatedPaths<paths>>({ baseUrl: backend_url });

  client.use(authenticateAllRequests);

  return client
}