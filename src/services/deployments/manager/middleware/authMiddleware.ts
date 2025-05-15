import { NextFunction, Request } from 'express';
import { Wallet } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { AuthorizationManager } from '../../../authorization.js';
import { DeploymentsResponse } from '../types.js';

export async function authMiddleware(
  req: Request,
  res: DeploymentsResponse,
  next: NextFunction,
): Promise<void> {
  const authorizationManager = new AuthorizationManager(
    new Wallet(new Keypair()),
  );

  const userId = req.headers['x-user-id'];
  const authToken = req.headers['authorization'];

  if (!authToken || !userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (
    !authorizationManager.validateHeader(req.headers, {
      publicKey: new PublicKey(userId),
      expiry: 300,
    })
  ) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
