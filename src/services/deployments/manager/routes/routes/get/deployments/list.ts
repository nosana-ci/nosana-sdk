import { Request } from 'express';

import { fetchDeployments } from '../../../helper/fetchDeployments.js';

import { DeploymentsResponse } from '../../../../types.js';

export async function deploymentsHandler(
  req: Request,
  res: DeploymentsResponse,
) {
  const { db } = res.locals;
  const userId = req.headers['x-user-id'];

  try {
    const deployments = await fetchDeployments(
      { owner: userId as string },
      db.deployments,
    );

    deployments.forEach((deployment) => {
      Reflect.deleteProperty(deployment, '_id');
    });
    res.status(200).json(deployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
