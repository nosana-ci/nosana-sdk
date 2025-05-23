import { Request, NextFunction } from 'express';

import { DeploymentsResponse } from '../../../types';
import { ErrorsMessages } from '../../../definitions/errors';

export async function validateActiveDeploymentMiddleware(
  req: Request<{ deployment: string }>,
  res: DeploymentsResponse,
  next: NextFunction,
): Promise<void> {
  const { deployment } = res.locals;

  if (deployment.status === 'ARCHIVED') {
    res.status(500).json({ error: ErrorsMessages.deployments.ARCHIVED });
    return;
  }
  next();
}
