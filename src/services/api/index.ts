import { apiConfigPreset } from '../../config.js';
import { createJobs, type JobsApi } from './jobs.js';
import { createNosanaAPIClient } from './client/index.js';
import { createCredits, type CreditsApi } from './credits.js';

import type { ApiConfig } from '../../types/index.js';

export interface Api {
  jobs: JobsApi;
  credits: CreditsApi;
}

export function createApi(environment: 'devnet' | 'mainnet',
  configIncoming: Partial<ApiConfig> | undefined,
  apiKey: string | undefined): Api {
  const config = { ...apiConfigPreset[environment], ...configIncoming };
  const client = createNosanaAPIClient(config.backend_url, apiKey);

  return {
    jobs: createJobs(client),
    credits: createCredits(client),
  };
}