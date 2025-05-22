import fs from 'fs';
import { Request } from 'express';
import { Keypair } from '@solana/web3.js';

import { TokenManager } from '../../../../../tokenManager';

import { DeploymentsResponse } from '../../../../types';
import { VAULT_PATH } from '../../../../definitions/vault';

export async function vaultWidthdrawHandler(
  req: Request<{ id: string }>,
  res: DeploymentsResponse,
) {
  const { db } = res.locals;
  const userId = req.headers['x-user-id'] as string;

  try {
    const vault = await db.vaults.findOne({
      vault: req.params.id,
      owner: userId,
    });

    if (vault === null) {
      res.send(404).json({ error: 'Vault not found.' });
      return;
    }

    const tokenManager = new TokenManager(
      vault.vault,
      vault.owner,
      'DESTINATION',
    );
    tokenManager.addNOS();
    tokenManager.addSOL();

    const vaultKey = fs.readFileSync(
      `${VAULT_PATH}${vault.vault.toString()}.json`,
      'utf8',
    );

    if (!vaultKey) {
      res.send(500).json({ error: 'Failed to find vault.' });
      return;
    }

    tokenManager.sign(Keypair.fromSecretKey(JSON.parse(vaultKey)));

    res.send(200).json({ transaction: 'TRANSACTION_ID' });
  } catch (error) {
    console.error('Error widthdrawing tokens:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
