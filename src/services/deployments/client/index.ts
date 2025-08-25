import createClient, { Middleware } from 'openapi-fetch';

import { getWallet } from '../../../utils.js';
import { AuthorizationManager } from '../../authorization.js';

import { DeploymentsConfig, Wallet } from '../../../types/index.js';
import { AuthenticatedPaths, AuthenticatedClient } from '../types.js';

export type * from './schema.d.ts';
export type QueryClient = AuthenticatedClient;

export const clientSelector = (
  wallet: Wallet,
  deploymentsConfig: DeploymentsConfig,
): QueryClient => {
  let instance: QueryClient | undefined = undefined;

  if (!instance) {
    const userId = getWallet(wallet).publicKey.toString();
    const authorizationManager = new AuthorizationManager(wallet);

    const authMiddleware: Middleware = {
      async onRequest({ request }) {
        request.headers.set('x-user-id', userId);
        
        const authHeader = await authorizationManager.generate('DeploymentsAuthorization', {
          includeTime: true,
        });
        
        request.headers.set('Authorization', authHeader);
      },
    };

    const baseClient = createClient<AuthenticatedPaths>({
      baseUrl: deploymentsConfig.backend_url,
      // headers: {
      //   'Content-Type': 'application/json',
      // },
    });

    baseClient.use(authMiddleware);

    instance = baseClient as unknown as QueryClient;
  }

  return instance;
};
