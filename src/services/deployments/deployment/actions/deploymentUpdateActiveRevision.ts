import { errorFormatter } from "../../../../utils/errorFormatter.js";

import type { QueryClient } from '../../../../client/index.js';
import { DeploymentState } from "../../types.js";

export async function deploymentUpdateActiveRevision(active_revision: number, client: QueryClient, state: DeploymentState) {
  const { data, error } = await client.PATCH(`/api/deployments/{deployment}/update-active-revision`, {
    params: { path: { deployment: state.id } },
    body: { active_revision },
  });

  if (error || !data) {
    throw errorFormatter("Error updating active revision", error);
  }

  Object.assign(state, {
    active_revision: data.active_revision,
    endpoints: data.endpoints,
    updated_at: data.updated_at,
  });
}