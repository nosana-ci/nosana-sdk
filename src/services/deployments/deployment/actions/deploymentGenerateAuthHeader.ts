import { QueryClient } from '../../client/index.js';
import { errorFormatter } from '../../../../utils/errorFormatter.js';

import { type DeploymentState } from '../../types.js';

export async function deploymentGenerateAuthHeader(
  client: QueryClient,
  state: DeploymentState,
): Promise<string> {
  const { data, error } = await client.GET(
    '/api/deployments/{deployment}/header',
    {
      params: { path: { deployment: state.id } },
    },
  );

  if (error || !data) {
    throw errorFormatter('Error generating deployment header', error);
  }

  return data.header;
}
