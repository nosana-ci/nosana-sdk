import { Request } from 'express';

import { DeploymentsResponse } from '../../../../types';

export async function deploymentUpdateTimeoutHandler(
  req: Request<{ id: string }, unknown, { timeout: number }>,
  res: DeploymentsResponse,
) {
  const { db } = res.locals;
  const userId = req.headers['x-user-id'] as string;
  const deploymentId = req.params.id;
  const timeout = req.body.timeout;

  try {
    const { acknowledged } = await db.deployments.updateOne(
      { id: deploymentId, owner: userId },
      {
        $set: {
          timeout,
        },
      },
    );

    if (!acknowledged) {
      res.status(500).json({
        error: 'Something when wrong whilst updating deployments timeout.',
      });
      return;
    }

    res.status(200).send();
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
