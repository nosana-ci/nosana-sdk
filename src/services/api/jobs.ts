import { NosanaAPIQueryClient } from './client/index.js';

import {
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

export function createJobs(client: NosanaAPIQueryClient) {
  return {
    async list(request: ListJobWithCreditsRequest) {
      const { data, error } = await client.POST('/api/jobs/create-with-credits', {
        body: request,
      });
      if (!data || error) {
        throw new Error(`Failed to create job: ${error || 'Unknown error'}`);
      }
      return data;
    },
    async extend(request: ExtendJobWithCreditsRequest) {
      const { data, error } = await client.POST('/api/jobs/extend-with-credits', {
        body: request,
      });
      if (!data || error) {
        throw new Error(`Failed to extend job: ${error || 'Unknown error'}`);
      }
      return data;
    },
    async stop(request: StopJobWithCreditsRequest) {
      const { data, error } = await client.POST('/api/jobs/stop-with-credits', {
        body: request,
      });
      if (!data || error) {
        throw new Error(`Failed to stop job: ${error || 'Unknown error'}`);
      }
      return data;
    }
  }
}
