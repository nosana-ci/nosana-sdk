import { Express } from 'express';

import { getVaultMiddleware } from '../middleware';

import { vaultWithdrawHandler } from '../routes/post';
import { vaultUpdateBalanceHandler } from '../routes/patch';

export function setupVaultRoutes(app: Express) {
  app.post(
    '/api/vault/:vault/withdraw',
    getVaultMiddleware,
    vaultWithdrawHandler,
  );
  app.patch(
    '/api/vault/:vault/update-balance',
    getVaultMiddleware,
    vaultUpdateBalanceHandler,
  );
}
