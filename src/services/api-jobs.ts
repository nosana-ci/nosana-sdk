import type { ApiJobsConfig } from '../types/index.js';
import { apiJobsConfigPreset } from '../config.js';

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

export interface BalanceResponse {
  assignedCredits: number;
  reservedCredits: number;
  settledCredits: number;
}

export class ApiJobs {
  private config: ApiJobsConfig;
  private apiKey: string;

  constructor(
    environment: 'devnet' | 'mainnet',
    config: Partial<ApiJobsConfig> | undefined,
    apiKey: string,
  ) {
    if (!apiKey.startsWith('nos_')) {
      throw new Error('Invalid API key: must start with "nos_"');
    }

    this.apiKey = apiKey;
    
    this.config = { ...apiJobsConfigPreset[environment], ...config };
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: any,
  ): Promise<T> {
    const url = `${this.config.backend_url}/api${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * List a job using API tokens/credits
   * @param request List job request parameters
   * @returns Promise with job creation response
   */
  async list(request: ListJobRequest): Promise<ListJobResponse> {
    return this.makeRequest<ListJobResponse>(
      '/jobs/create-with-credits', 
      'POST',
      request,
    );
  }

  /**
   * Extend a job using API tokens/credits
   * @param request Extend job request parameters
   * @returns Promise with job extension response
   */
  async extend(request: ExtendJobRequest): Promise<ExtendJobResponse> {
    return this.makeRequest<ExtendJobResponse>(
      '/jobs/extend-with-credits',
      'POST',
      request,
    );
  }

  /**
   * Stop a job using API tokens/credits
   * @param request Stop job request parameters
   * @returns Promise with job stop response
   */
  async stop(request: StopJobRequest): Promise<StopJobResponse> {
    return this.makeRequest<StopJobResponse>(
      '/jobs/stop-with-credits',
      'POST',
      request,
    );
  }

  /**
   * Get the credit balance for the user
   * @returns Promise with credit balance response
   */
  async balance(): Promise<BalanceResponse> {
    return this.makeRequest<BalanceResponse>('/credits/balance', 'GET');
  }
}
