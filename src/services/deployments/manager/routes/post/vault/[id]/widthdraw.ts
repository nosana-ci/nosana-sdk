import { Request } from 'express';
import { PublicKey, Transaction } from '@solana/web3.js';

import { DeploymentsResponse } from '../../../../types';
import { ConnectionSelector } from '../../../../../../../classes/connection/selector';
import { getNosTokenAddressForAccount } from '../../../../../tokenManager/helpers/NOS/getNosTokenAddressForAccount';

export async function vaultWidthdrawHandler(
  req: Request<{ id: string }>,
  res: DeploymentsResponse,
) {
  const { db } = res.locals;
  const userId = req.headers['x-user-id'] as string;
  const connection = ConnectionSelector();

  try {
    const vault = await db.vaults.findOne({
      vault: req.params.id,
      owner: userId,
    });

    if (vault === null) {
      res.send(404).json({ error: 'Vault not found.' });
      return;
    }

    const transaction = new Transaction();

    const { account: destinationTokenAccount, balance: destinationBalance } =
      await getNosTokenAddressForAccount(
        new PublicKey(vault.owner),
        connection,
      );

    // TODO: work out how to make the user pay for transaction or calculate required SOL transaction

    // await sendNosTokens(
    //   amount,
    //   sourceTokenAccount,
    //   destination,
    //   destinationTokenAccount,
    //   payer,
    //   destinationBalance === null,
    //   transaction,
    // );
  } catch (error) {
    console.error('Error widthdrawing tokens:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
