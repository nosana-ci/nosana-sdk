import { Request } from 'express';

import { DeploymentsResponse } from '../../../../../types.js';

export async function deploymentIdHandler(
  _: Request<{ deployment: string }>,
  res: DeploymentsResponse,
) {
  const { deployment } = res.locals;

  Reflect.deleteProperty(deployment, '_id');
  res.status(200).json(deployment);
}
