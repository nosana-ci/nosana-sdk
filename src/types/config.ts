import { PublicKey, Signer } from '@solana/web3.js';

export type SolanaConfig = {
  network: string;
  jobs_address: string;
  nos_address: string;
  market_address: string;
  rewards_address: string;
  nodes_address: string;
  stake_address: string;
  pools_address: string;
  pool_address: string;
  priority_fee?: number;
  maximumPriorityFee?: number;
  dynamicPriorityFee?: boolean;
  priorityFeeStrategy?:
  | 'min'
  | 'low'
  | 'medium'
  | 'high'
  | 'veryHigh'
  | 'unsafeMax';
  priorityFeeAccounts?: string[];
  feePayer?: Signer;
};

export type IPFSConfig = {
  api: string;
  gateway: string;
  jwt?: string;
};

export type ClientConfig = {
  solana?: Partial<SolanaConfig>;
  ipfs?: Partial<IPFSConfig>;
  api?: Partial<ApiConfig>;
  apiKey?: string;
  authorization?: {
    store: AuthorizationStore;
  }
};

export type AuthorizationStore = {
  get: (key: string, options: GenerateOptions) => string | undefined;
  set: (key: string, options: GenerateOptions, value: string) => void;
}

export type ApiConfig = {
  backend_url: string
};

export type AuthorizationOptions = {
  expiry: number;
  includeTime: boolean;
  key: string;
};

export type ValidateOptions = {
  expiry: number;
  publicKey: PublicKey;
  seperator: string;
  expected_message?: string;
};

export type GenerateOptions = {
  includeTime: boolean;
  seperator: string;
};