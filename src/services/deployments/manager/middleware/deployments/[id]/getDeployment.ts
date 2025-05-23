import { Request, NextFunction } from 'express';

import { DeploymentsResponse } from '../../../types';
import { ErrorsMessages } from '../../../definitions/errors';

export async function getDeploymentMiddleware(
  req: Request<{ deployment: string }>,
  res: DeploymentsResponse,
  next: NextFunction,
): Promise<void> {
  const { db } = res.locals;
  const deploymentId = req.params.deployment;
  const userId = req.headers['x-user-id'] as string;

  try {
    const deployment = await db.deployments.findOne({
      id: deploymentId,
      owner: userId,
    });

    if (deployment === null) {
      res.status(404).json({ error: ErrorsMessages.deployments.NOT_FOUND });
      return;
    }

    res.locals.deployment = deployment;
    next();
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: ErrorsMessages.generic.SOMETHING_WENT_WRONG });
  }
}
