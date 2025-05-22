import fs from 'fs';
import { Request } from 'express';

import { DeploymentsResponse } from '../../../../types.js';

export async function deploymentDeleteHandler(
  req: Request<{ id: string }, unknown, unknown>,
  res: DeploymentsResponse,
) {
  const { db } = res.locals;
  const userId = req.headers['x-user-id'] as string;

  try {
    const deployment = await db.deployments.findOne({
      id: req.params.id,
      owner: userId,
    });

    if (deployment === null) {
      res.status(404).json({ error: 'Deployment not found.' });
      return;
    }

    // TODO: ADD VAULT BALANCE CHECK
    const { acknowledged } = await db.vaults.deleteOne({
      id: { $eq: deployment.vault },
      owner: { $eq: userId },
    });

    if (!acknowledged) {
      res.status(500).json({
        error: 'Something went wrong when removing deployment vault.',
      });
      return;
    }

    fs.unlinkSync(`/.nosana/vault/${deployment.vault}.json`);

    const { acknowledged: acknowledgedDeployments } =
      await db.deployments.deleteOne({
        id: { $eq: req.params.id },
        owner: { $eq: userId },
      });

    if (!acknowledgedDeployments) {
      res
        .status(500)
        .json({ error: 'Something went wrong when starting deployment,' });
      return;
    }

    res.status(200).json({ status: 'STARTING' });
  } catch (error) {
    console.error('Error creating deployment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
