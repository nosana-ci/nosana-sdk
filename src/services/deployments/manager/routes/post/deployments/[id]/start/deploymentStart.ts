import { Request } from 'express';

import { DeploymentsResponse, DeploymentStatus } from '../../../../../types.js';
import { ErrorsMessages } from '../../../../../definitions/errors.js';

export async function deploymentStartHandler(
  req: Request<{ deployment: string }, unknown, unknown>,
  res: DeploymentsResponse,
) {
  const { db, deployment } = res.locals;
  const userId = req.headers['x-user-id'] as string;

  try {
    const { acknowledged } = await db.deployments.updateOne(
      { id: { $eq: deployment.id }, owner: { $eq: userId } },
      {
        $set: {
          status: DeploymentStatus.STARTING,
        },
      },
    );

    if (!acknowledged) {
      res
        .status(500)
        .json({ error: ErrorsMessages.deployments.FAILED_STARTING });
      return;
    }

    res.status(200).json({ status: DeploymentStatus.STARTING });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: ErrorsMessages.generic.SOMETHING_WENT_WRONG });
  }
}
