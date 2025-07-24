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
};

export type SecretsConfig = {
  manager: string;
};

export type IPFSConfig = {
  api: string;
  gateway: string;
  jwt?: string;
};

export type ClientConfig = {
  solana?: Partial<SolanaConfig>;
  ipfs?: Partial<IPFSConfig>;
  secrets?: Partial<SecretsConfig>;
  deployments?: Partial<DeploymentsConfig>;
};

export type DeploymentsConfig = {
  backend_url: string;
};
