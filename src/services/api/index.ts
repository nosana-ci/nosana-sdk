import type { ApiConfig } from '../../types/index.js';
import { apiConfigPreset } from '../../config.js';
import { Jobs } from './jobs.js';
import { Credits } from './credits.js';

export class Api {
  private config: ApiConfig;
  private apiKey: string | undefined;

  jobs: Jobs;
  credits: Credits;

  constructor(
    environment: 'devnet' | 'mainnet',
    config: Partial<ApiConfig> | undefined,
    apiKey: string | undefined,
  ) {
    if (apiKey && !apiKey.startsWith('nos_')) {
      throw new Error('Invalid API key: must start with "nos_"');
    }

    this.apiKey = apiKey;
    this.config = { ...apiConfigPreset[environment], ...config };

    this.jobs = new Jobs(this);
    this.credits = new Credits(this);
  }

  async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: any,
  ): Promise<T> {
    const url = `${this.config.backend_url}/api${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    headers['Authorization'] = `Bearer ${this.apiKey}`;

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`,
      );
    }

    return response.json();
  }
}