import { type QueryClient } from '../../client/index.js';
import { createAuthorization, type AuthorizationApi } from './authorization.js';
import { createJobs, type JobsApi } from './jobs.js';
import { createCredits, type CreditsApi } from './credits.js';

export interface Api {
  authorization: AuthorizationApi;
  jobs: JobsApi;
  credits: CreditsApi;
}

export function createApi(client: QueryClient): Api {
  return {
    authorization: createAuthorization(client),
    jobs: createJobs(client),
    credits: createCredits(client),
  };
}