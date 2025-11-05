import { errorFormatter } from "../../../../utils/errorFormatter.js";

import { DeploymentState } from "../../types.js";
import type { components, QueryClient } from '../../../../client/index.js';
import { JobDefinition, validateJobDefinition } from "../../../../types/index.js";

export async function deploymentCreateNewRevision(jobDefinition: JobDefinition, client: QueryClient, state: DeploymentState) {
  if (!validateJobDefinition(jobDefinition)) {
    throw new Error("Invalid job definition");
  }

  const { data, error } = await client.POST(`/api/deployments/{deployment}/create-revision`, {
    params: { path: { deployment: state.id } },
    body: jobDefinition as components["schemas"]["JobDefinition"],
  });

  if (error || !data) {
    throw errorFormatter("Error creating new revision", error);
  }

  Object.assign(state, {
    active_revision: data.active_revision,
    endpoints: data.endpoints,
    updated_at: new Date(data.updated_at),
    revisions: [...state.revisions, data.revisions],
  });
}