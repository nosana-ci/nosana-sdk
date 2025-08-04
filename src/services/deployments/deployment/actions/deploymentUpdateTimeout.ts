import { errorFormatter } from '../../../../utils/errorFormatter.js';

import type { QueryClient } from '../../client/index.js';
import type { DeploymentState } from '../../types';

/**
   * @param timeout Timeout in seconds
   * @throws Error if timeout is less than 60 seconds
   * @throws Error if there is an error updating the timeout
   * @returns Promise<void>
   * @description Updates the timeout for the deployment.
   * This will change the maximum time the deployment can run before it is stopped.
   */
export async function deploymentUpdateTimeout(
  timeout: number;
  client: QueryClient,
  state: DeploymentState,
): Promise<void> {
  if (timeout < 60) {
      throw errorFormatter('Timeout must be greater than 60 seconds');
    }

    const { data, error } = await client.PATCH(
      '/api/deployment/{deployment}/update-timeout',
      {
        params: { path: { deployment: state.id } },
        body: { timeout },
      },
    );

    if (error || !data) {
      throw errorFormatter('Error updating deployment timeout', error);
    }

    Object.assign(state, {
      timeout: data.timeout,
      updated_at: new Date(data.updated_at),
    });
}
