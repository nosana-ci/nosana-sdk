import { Request } from 'express';

import { ErrorsMessages } from '../../../../definitions/errors';

import { DeploymentsResponse } from '../../../../types';

export async function deploymentUpdateTimeoutHandler(
  req: Request<{ deployment: string }, unknown, { timeout: number }>,
  res: DeploymentsResponse,
) {
  const { db, deployment } = res.locals;

  const timeout = req.body.timeout;
  const userId = req.headers['x-user-id'] as string;

  try {
    const { acknowledged } = await db.deployments.updateOne(
      { id: { $eq: deployment.id }, owner: { $eq: userId } },
      {
        $set: {
          timeout,
        },
      },
    );

    if (!acknowledged) {
      res.status(500).json({
        error: ErrorsMessages.deployments.FAILED_TIMOUT_UPDATE,
      });
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
