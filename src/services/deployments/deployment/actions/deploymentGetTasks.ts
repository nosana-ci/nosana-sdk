import { errorFormatter } from '../../../../utils/errorFormatter.js';

import type { QueryClient } from '../../client/index.js';
import type { components } from '../../client/schema.js';
import type { DeploymentState } from '../../types';

/**
 * @returns Promise<components["schemas"]["Task"][]>
 * @throws Error if there is an error fetching the tasks
 * @throws Error if the deployment is not found
 * @description Fetches the tasks for the deployment.
 * This will return the current tasks associated with the deployment.
 * It is useful for monitoring the deployment's progress and status.
 */
export async function deploymentGetTasks(
  client: QueryClient,
  state: DeploymentState,
): Promise<components['schemas']['Task'][]> {
  const { data, error } = await client.GET(
    '/api/deployment/{deployment}/tasks',
    {
      params: { path: { deployment: state.id } },
    },
  );

  if (error || !data) {
    throw errorFormatter('Error getting deployment tasks', error);
  }

  return data;
}
