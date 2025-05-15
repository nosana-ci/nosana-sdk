import { Request } from 'express';

import { DeploymentsResponse } from '../../../types.js';

export async function deploymentsHandler(
  req: Request,
  res: DeploymentsResponse,
) {
  const { db } = res.locals;
  const userId = req.headers['x-user-id'];

  try {
    const deployments = await db.deployments.find({ owner: userId }).toArray();
    deployments.forEach((deployment) => {
      Reflect.deleteProperty(deployment, '_id');
    });
    res.status(200).json(deployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
