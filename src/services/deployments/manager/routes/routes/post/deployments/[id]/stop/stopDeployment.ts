import { Request } from 'express';

import { ErrorsMessages } from '../../../../../../definitions/errors';
import { DeploymentsResponse, DeploymentStatus } from '../../../../../../types';

export async function deploymentStopHandler(
  req: Request<{ deployment: string }, unknown, unknown>,
  res: DeploymentsResponse,
) {
  const updated_at = new Date();
  const { db, deployment } = res.locals;
  const userId = req.headers['x-user-id'] as string;

  if (
    !(
      [
        DeploymentStatus.RUNNING,
        DeploymentStatus.STARTING,
      ] as DeploymentStatus[]
    ).includes(deployment.status)
  ) {
    res.status(500).json({ error: ErrorsMessages.deployments.INCORRECT_STATE });
    return;
  }

  const { acknowledged: acknowledgedDeployments } =
    await db.deployments.updateOne(
      {
        id: { $eq: deployment.id },
        owner: { $eq: userId },
      },
      {
        $set: {
          status: DeploymentStatus.STOPPING,
          updated_at,
        },
      },
    );

  if (!acknowledgedDeployments) {
    res.status(500).json({ error: ErrorsMessages.deployments.FAILED_TO_STOP });
    return;
  }

  res.status(200).json({ updated_at });
}
