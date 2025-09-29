import type { Api } from './index.js';

export interface BalanceResponse {
  assignedCredits: number;
  reservedCredits: number;
  settledCredits: number;
}

export class Credits {
  private api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  async balance(): Promise<BalanceResponse> {
    return this.api.makeRequest<BalanceResponse>('/credits/balance', 'GET');
  }
}