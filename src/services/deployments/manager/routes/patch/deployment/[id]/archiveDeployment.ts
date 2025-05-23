import fs from 'fs';
import { Request } from 'express';
import { Wallet } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { Vault } from '../../../../../vault/index.js';

import {
  DeploymentsResponse,
  DeploymentStatus,
  VaultStatus,
} from '../../../../types.js';
import { ErrorsMessages } from '../../../../definitions/errors.js';

export async function deploymentArchiveHandler(
  req: Request<{ deployment: string }, unknown, unknown>,
  res: DeploymentsResponse,
) {
  const { db, deployment } = res.locals;
  const userId = req.headers['x-user-id'] as string;

  try {
    if (deployment.status !== 'STOPPED') {
      res
        .status(500)
        .json({ error: ErrorsMessages.deployments.INCORRECT_STATE });
      return;
    }

    const vault = new Vault(
      new PublicKey(deployment.vault),
      new Wallet(new Keypair()),
    );

    const { SOL, NOS } = await vault.getBalance();

    if (SOL !== 0 || NOS !== 0) {
      res.status(500).json({
        error: ErrorsMessages.vaults.NOT_EMPTY,
      });
      return;
    }

    const { acknowledged } = await db.vaults.updateOne(
      {
        id: { $eq: deployment.vault },
        owner: { $eq: userId },
      },
      {
        $set: {
          status: VaultStatus.ARCHIVED,
        },
      },
    );

    if (!acknowledged) {
      res.status(500).json({
        error: ErrorsMessages.vaults.FAILED_TO_ARCHIVE,
      });
      return;
    }

    // TODO: Decide if private keys should be deleted
    // fs.unlinkSync(`/.nosana/vault/${deployment.vault}.json`);

    const { acknowledged: acknowledgedDeployments } =
      await db.deployments.updateOne(
        {
          id: { $eq: deployment.id },
          owner: { $eq: userId },
        },
        {
          $set: {
            status: DeploymentStatus.ARCHIVED,
          },
        },
      );

    if (!acknowledgedDeployments) {
      res
        .status(500)
        .json({ error: ErrorsMessages.deployments.FAILED_TO_ARCHIVE });
      return;
    }

    res.status(200).send();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: ErrorsMessages.generic.SOMETHING_WENT_WRONG });
  }
}
