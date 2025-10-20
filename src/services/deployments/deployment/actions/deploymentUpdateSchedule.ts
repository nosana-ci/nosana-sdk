import { QueryClient } from "../../client";
import { errorFormatter } from "../../../../utils/errorFormatter";

import { DeploymentState } from "../../types";

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