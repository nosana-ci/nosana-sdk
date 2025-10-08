import createClient, { Middleware } from 'openapi-fetch';

import { getWallet } from '../../../utils.js';
import { AuthorizationManager } from '../../authorization.js';

import { DeploymentsConfig, Wallet } from '../../../types/index.js';
import { AuthenticatedPaths, AuthenticatedClient } from '../../../types/utils.js';
import { paths } from "./schema.js"

export type * from './schema.d.ts';
export type QueryClient = AuthenticatedClient<paths>;

export const createDeploymentClient = (
  wallet: Wallet,
  deploymentsConfig: DeploymentsConfig,
): QueryClient => {
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

  const baseClient = createClient<AuthenticatedPaths<paths>>({
    baseUrl: deploymentsConfig.backend_url,
  });

  baseClient.use(authMiddleware);

  return baseClient;
};
