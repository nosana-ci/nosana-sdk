import createClient, { Middleware } from 'openapi-fetch';

import { Config } from '../../../config';
import { getWallet } from '../../../utils';
import { AuthorizationManager } from '../../authorization';

import { Wallet } from '../../../types';
import { AuthenticatedPaths, AuthenticatedClient } from './types';

export type QueryClient = AuthenticatedClient;

export const clientSelector = (wallet: Wallet): QueryClient => {
  let instance: QueryClient | undefined = undefined;

  if (!instance) {
    const userId = getWallet(wallet).publicKey.toString();
    const authorizationManager = new AuthorizationManager(wallet);

    const authMiddleware: Middleware = {
      onRequest({ request }) {
        request.headers.set('x-user-id', userId);
        request.headers.set(
          'Authorization',
          authorizationManager.generate('DeploymentsAuthorization', {
            includeTime: true,
          }),
        );
      },
    };

    const baseClient = createClient<AuthenticatedPaths>({
      baseUrl: `${new Config().deploymentsConfig.backend_url}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    baseClient.use(authMiddleware);

    instance = baseClient as unknown as QueryClient;
  }

  return instance;
};
