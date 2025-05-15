import { Request } from 'express';

import { DeploymentsResponse } from '../../../../types.js';

export async function deploymentIdHandler(
  req: Request<{ id: string }>,
  res: DeploymentsResponse,
) {
  const { db } = res.locals;
  const userId = req.headers['x-user-id'];

  try {
    const deployment = await db.deployments.findOne({
      id: req.params.id,
      owner: userId,
    });

    if (deployment === null) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    Reflect.deleteProperty(deployment, '_id');
    res.status(200).json(deployment);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
