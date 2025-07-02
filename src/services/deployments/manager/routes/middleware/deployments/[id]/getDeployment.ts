import { Request, NextFunction } from 'express';

import { DeploymentsResponse } from '../../../../types';
import { ErrorsMessages } from '../../../../definitions/errors';
import { fetchDeployments } from '../../../helper/fetchDeployments';

export async function getDeploymentMiddleware(
  req: Request<{ deployment: string }>,
  res: DeploymentsResponse,
  next: NextFunction,
): Promise<void> {
  const { db } = res.locals;
  const id = req.params.deployment;
  const owner = req.headers['x-user-id'] as string;

  try {
    const deployments = await fetchDeployments({ id, owner }, db.deployments);

    if (deployments.length === 0) {
      res.status(404).json({ error: ErrorsMessages.deployments.NOT_FOUND });
      return;
    }

    res.locals.deployment = deployments[0];
    next();
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: ErrorsMessages.generic.SOMETHING_WENT_WRONG });
  }
}
