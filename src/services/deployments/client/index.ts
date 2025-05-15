import createClient, { Middleware } from 'openapi-fetch';

import { Config } from '../../../config';
import { Wallet } from '../../../types';

import { getWallet } from '../../../utils';
import { AuthorizationManager } from '../../authorization';

export type QueryClient = ReturnType<typeof createClient<any, any | undefined>>;

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

    instance = createClient({
      baseUrl: `${new Config().deploymentsConfig.backend_url}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    instance.use(authMiddleware);
  }

  return instance;
};
