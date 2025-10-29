import { errorFormatter } from '../../utils/errorFormatter.js';

import type { QueryClient } from '../../client/index.js';

import type {
  ListJobWithCreditsRequest,
  ListJobWithCreditsResponse,
  ExtendJobWithCreditsRequest,
  ExtendJobWithCreditsResponse,
  StopJobWithCreditsRequest,
  StopJobWithCreditsResponse
} from './types.js';

export interface JobsApi {
  list: (request: ListJobWithCreditsRequest) => Promise<ListJobWithCreditsResponse>;
  extend: (request: ExtendJobWithCreditsRequest) => Promise<ExtendJobWithCreditsResponse>;
  stop: (request: StopJobWithCreditsRequest) => Promise<StopJobWithCreditsResponse>;
}

export function createJobs(client: QueryClient) {
  return {
    async list(request: ListJobWithCreditsRequest) {
      const { data, error } = await client.POST('/api/jobs/create-with-credits', {
        body: request,
      });
      if (!data || error) {
        throw errorFormatter('Failed to create job', error);
      }
      return data;
    },
    async extend(request: ExtendJobWithCreditsRequest) {
      const { data, error } = await client.POST('/api/jobs/extend-with-credits', {
        body: request,
      });
      if (!data || error) {
        throw errorFormatter('Failed to extend job', error);
      }
      return data;
    },
    async stop(request: StopJobWithCreditsRequest) {
      const { data, error } = await client.POST('/api/jobs/stop-with-credits', {
        body: request,
      });
      if (!data || error) {
        throw errorFormatter('Failed to stop job', error);
      }
      return data;
    }
  }
}
