import { errorFormatter } from "../../../../utils/errorFormatter.js";

import type { QueryClient } from '../../../../client/index.js';
import { DeploymentState } from "../../types.js";

export async function deploymentUpdateSchedule(schedule: string, client: QueryClient, state: DeploymentState) {
  const { data, error } = await client.PATCH(`/api/deployments/{deployment}/update-schedule`, {
    params: { path: { deployment: state.id } },
    body: { schedule },
  });

  if (error || !data) {
    throw errorFormatter("Error updating schedule", error);
  }

  Object.assign(state, {
    schedule: data.schedule
  });
}