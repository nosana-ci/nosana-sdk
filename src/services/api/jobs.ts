import type { Api } from './index.js';

export interface ListJobRequest {
  ipfsHash: string;
  market: string;
  timeout?: number;
  host?: string;
}

export interface ListJobResponse {
  jobAddress: string;
  costUSD: number;
  creditsUsed: number;
  reservationId: string;
  project: string;
}

export interface ExtendJobRequest {
  jobAddress: string;
  extensionSeconds: number;
}

export interface ExtendJobResponse {
  jobAddress: string;
  costUSD: number;
  creditsUsed: number;
  reservationId: string;
  extensionSeconds: number;
}

export interface StopJobRequest {
  jobAddress: string;
}

export interface StopJobResponse {
  success: boolean;
  message: string;
  jobAddress: string;
  transactionId: string;
  delisted: boolean;
}

export class Jobs {
  private api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  async list(request: ListJobRequest): Promise<ListJobResponse> {
    return this.api.makeRequest<ListJobResponse>(
      '/jobs/create-with-credits',
      'POST',
      request,
    );
  }

  async extend(request: ExtendJobRequest): Promise<ExtendJobResponse> {
    return this.api.makeRequest<ExtendJobResponse>(
      '/jobs/extend-with-credits',
      'POST',
      request,
    );
  }

  async stop(request: StopJobRequest): Promise<StopJobResponse> {
    return this.api.makeRequest<StopJobResponse>(
      '/jobs/stop-with-credits',
      'POST',
      request,
    );
  }
}