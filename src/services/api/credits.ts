import { NosanaAPIQueryClient } from './client/index.js';

import { Balance } from './types.js';

export interface CreditsApi {
  balance: () => Promise<Balance>;
}

export function createCredits(client: NosanaAPIQueryClient): CreditsApi {
  const balance = async () => {
    const { data, error } = await client.GET('/api/credits/balance');
    if (!data || error) {
      throw new Error(`Failed to fetch balance`);
    }
    return data;
  };

  return {
    balance
  };
}