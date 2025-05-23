import fs from 'fs';
import { Request } from 'express';
import { Keypair } from '@solana/web3.js';

import { VAULT_PATH } from '../../../../definitions/vault';
import { TokenManager } from '../../../../../../../classes/tokenManager';

import { VaultsResponse } from '../../../../types';
import { ErrorsMessages } from '../../../../definitions/errors';

export async function vaultWidthdrawHandler(
  req: Request<{ vault: string }, unknown, { SOL?: number; NOS?: number }>,
  res: VaultsResponse,
) {
  const { vault } = res.locals;

  try {
    const tokenManager = new TokenManager(
      vault.vault,
      vault.owner,
      'DESTINATION',
    );

    await tokenManager.addSOL(req.body.SOL);
    await tokenManager.addNOS(req.body.NOS);

    const vaultKey = fs.readFileSync(
      `${VAULT_PATH}${vault.vault.toString()}.json`,
      'utf8',
    );

    if (!vaultKey) {
      res.send(500).json({ error: ErrorsMessages.vaults.FAILED_TO_FIND_KEY });
      return;
    }

    const tx = await tokenManager.signAndSerialize(
      Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(vaultKey) as Iterable<number>),
      ),
    );

    res.status(200).json({ transaction: tx });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: ErrorsMessages.generic.SOMETHING_WENT_WRONG });
  }
}
