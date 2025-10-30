import { errorFormatter } from "../../../../utils/errorFormatter.js";

import type { DeploymentState } from "../../types.js";
import type { paths, QueryClient } from "../../../../client/index.js";

export async function deploymentGetJob(
  client: QueryClient,
  deployment: string,
  job: string
): Promise<paths["/api/deployments/{deployment}/jobs/{job}"]["get"]["responses"]["200"]["content"]["application/json"]> {
  const { data, error } = await client.GET(
    '/api/deployments/{deployment}/jobs/{job}',
    {
      params: { path: { deployment, job } },
    },
  )

  if (error) {
    throw errorFormatter('Error getting deployment job', error);
  }

  return data
}