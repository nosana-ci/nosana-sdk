import { QueryClient } from '../../client/index.js';
import { errorFormatter } from '../../../../utils/errorFormatter.js';

import { DeploymentStatus, type DeploymentState } from '../../types.js';

/**
 * @throws Error if the deployment is already running or starting
 * @throws Error if there is an error starting the deployment
 * @returns Promise<void>
 * @description Starts the deployment.
 */
export async function deploymentStart(
  client: QueryClient,
  state: DeploymentState,
): Promise<void> {
  if (
    [DeploymentStatus.STARTING, DeploymentStatus.RUNNING].includes(state.status)
  ) {
    throw errorFormatter('Cannot start a deployment that is already running.');
  }

  const { data, error } = await client.POST(
    '/api/deployment/{deployment}/start',
    {
      params: { path: { deployment: state.id } },
    },
  );

  if (error || !data) {
    throw errorFormatter('Error starting deployment', error);
  }

  Object.assign(state, {
    status: data.status,
    updated_at: new Date(data.updated_at),
  });
}
