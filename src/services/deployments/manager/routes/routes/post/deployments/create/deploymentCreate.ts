import typia from 'typia';
import { Request } from 'express';

import {
  DeploymentCreateRequest,
  DeploymentCreateResponse,
} from './deploymentCreate.types.js';
import {
  createAndStoreVault,
  createDeployment,
} from './deploymentCreate.factory.js';

import { DeploymentsResponse } from '../../../../../types.js';

export async function deploymentCreateHandler(
  req: Request<unknown, unknown, DeploymentCreateRequest>,
  res: DeploymentsResponse<DeploymentCreateResponse>,
) {
  const { db } = res.locals;
  const userId = req.headers['x-user-id'] as string;

  try {
    if (!typia.validate<DeploymentCreateRequest>(req.body).success) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    const created_at = new Date();

    const vault = await createAndStoreVault(userId, created_at);
    const { acknowledged: vaultAcknowledged } = await db.vaults.insertOne(
      vault,
    );

    if (!vaultAcknowledged) {
      res.status(500).json({ error: 'Failed to create deployment vault' });
      return;
    }

    const deployment = createDeployment(
      req.body,
      vault.vault,
      userId,
      created_at,
    );
    const { acknowledged } = await db.deployments.insertOne(deployment);

    if (!acknowledged) {
      res.status(500).json({ error: 'Failed to create deployment' });
      return;
    }

    Reflect.deleteProperty(deployment, '_id');
    res.status(201).json(deployment);
  } catch (error) {
    console.error('Error creating deployment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
