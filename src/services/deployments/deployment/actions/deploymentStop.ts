import { QueryClient } from '../../client/index.js';
import { errorFormatter } from '../../../../utils/errorFormatter.js';

import { DeploymentStatus, type DeploymentState } from '../../types.js';

/**
 * @throws Error if the deployment is already stopped
 * @throws Error if there is an error stopping the deployment
 * @returns Promise<void>
 * @description Stops the deployment.
 * This will halt the deployment and prevent further actions until it is started again.
 * It is useful for pausing deployments without archiving them.
 */
export async function deploymentStop(
  client: QueryClient,
  state: DeploymentState,
): Promise<void> {
  if (
    [DeploymentStatus.STOPPING, DeploymentStatus.STOPPED].includes(state.status)
  ) {
    throw errorFormatter('Deployment is already stopped');
  }

  const { data, error } = await client.POST(
    '/api/deployment/{deployment}/stop',
    {
      params: { path: { deployment: state.id } },
    },
  );

  if (error || !data) {
    throw errorFormatter('Error stopping deployment', error);
  }

  Object.assign(state, {
    status: DeploymentStatus.STOPPING,
    updated_at: new Date(data.updated_at),
  });
}
