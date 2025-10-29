import { errorFormatter } from '../../../../utils/errorFormatter.js';

import type { QueryClient } from '../../../../client/index.js';
import { type DeploymentState } from '../../types.js';

/**
 * @param replicas Number of replicas to set for the deployment
 * @throws Error if replicas is less than 1
 * @throws Error if there is an error updating the replica count
 * @returns Promise<void>
 * @description Updates the number of replicas for the deployment.
 * This will change the number of instances running for the deployment.
 */
export async function deploymentUpdateReplicaCount(
  replicas: number,
  client: QueryClient,
  state: DeploymentState,
): Promise<void> {
  if (replicas < 1) {
    throw errorFormatter('Replica count must be at least 1');
  }

  const { data, error } = await client.PATCH(
    '/api/deployments/{deployment}/update-replica-count',
    {
      params: { path: { deployment: state.id } },
      body: { replicas },
    },
  );

  if (error || !data) {
    throw errorFormatter('Error updating deployment replica count', error);
  }

  Object.assign(state, {
    replicas: data.replicas,
    updated_at: new Date(data.updated_at),
  });
}
