import { QueryClient } from '../../client/index.js';
import { errorFormatter } from '../../../../utils/errorFormatter.js';

import { DeploymentStatus, type DeploymentState } from '../../types.js';

/**
 * @throws Error if the deployment is not stopped
 * @throws Error if there is an error archiving the deployment
 * @returns Promise<void>
 * @description Archives the deployment.
 * This will mark the deployment as archived and prevent further modifications.
 * It is useful for cleaning up deployments that are no longer needed.
 */
export async function deploymentArchive(
  client: QueryClient,
  state: DeploymentState,
) {
  if (state.status !== DeploymentStatus.STOPPED) {
    throw errorFormatter('Deployment must be stopped before archiving');
  }

  const { data, error } = await client.POST(
    '/api/deployments/{deployment}/archive',
    {
      params: { path: { deployment: state.id } },
    },
  );

  if (error || !data) {
    throw errorFormatter('Error archiving deployment', error);
  }
  Object.assign(state, {
    status: DeploymentStatus.ARCHIVED,
    updated_at: new Date(data.updated_at),
  });

  // Freeze the state to prevent further modifications
  Object.freeze(state);
}
