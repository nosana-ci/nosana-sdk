import { QueryClient } from "../../client";
import { errorFormatter } from "../../../../utils/errorFormatter";

import { DeploymentState } from "../../types";
import { JobDefinition, validateJobDefinition } from "../../../../types";

export async function deploymentCreateNewRevision(jobDefinition: JobDefinition, client: QueryClient, state: DeploymentState) {
  if (!validateJobDefinition(jobDefinition)) {
    throw new Error("Invalid job definition");
  }

  const { data, error } = await client.POST(`/api/deployments/{deployment}/create-revision`, {
    params: { path: { deployment: state.id } },
    body: jobDefinition,
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