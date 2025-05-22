import { Request } from 'express';
import { PublicKey } from '@solana/web3.js';

import { ConnectionSelector } from '../../../../../../../classes/connection/selector';
import { getNosTokenAddressForAccount } from '../../../../../tokenManager/helpers/NOS/getNosTokenAddressForAccount';

import { DeploymentsResponse } from '../../../../types';

export async function vaultUpdateBalanceHandler(
  req: Request<{ id: string }>,
  res: DeploymentsResponse,
) {
  const { db } = res.locals;
  const userId = req.headers['x-user-id'] as string;

  try {
    const connection = ConnectionSelector();

    const [solBalance, { account, balance }] = await Promise.all([
      connection.getBalance(new PublicKey(req.params.id)),
      getNosTokenAddressForAccount(new PublicKey(req.params.id), connection),
    ]);

    const { acknowledged } = await db.vaults.updateOne(
      { vault: req.params.id, owner: userId },
      {
        $set: {
          sol: solBalance,
          nos: balance ?? 0,
          nos_ata: account.toString(),
        },
      },
    );

    if (!acknowledged) {
      res
        .status(500)
        .json({ error: 'Something when wrong whilst updating the balance.' });
      return;
    }

    res.status(200).json({
      sol: solBalance,
      nos: balance,
    });
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
