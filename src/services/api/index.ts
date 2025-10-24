import { createJobs, type JobsApi } from './jobs.js';
import { type QueryClient } from '../../client/index.js';
import { createCredits, type CreditsApi } from './credits.js';

export interface Api {
  jobs: JobsApi;
  credits: CreditsApi;
}

export function createApi(client: QueryClient): Api {
  return {
    jobs: createJobs(client),
    credits: createCredits(client),
  };
}