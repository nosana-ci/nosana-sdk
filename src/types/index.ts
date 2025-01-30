import { Keypair } from '@solana/web3.js';
import { Wallet as AnchorWallet } from '@coral-xyz/anchor';

export type Wallet = AnchorWallet | string | Keypair | Iterable<number>;

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
  dynamicPriorityFee?: boolean;
  priorityFeeStrategy?: 'low' | 'medium' | 'high';
  priorityFeeAccounts?: string[];
};

export * from './config.js';
export * from './nosana_jobs.js';
export * from './job.js';
export * from './node.js';
export * from './nosana_nodes.js';
export * from './market.js';
export * from './run.js';
export * from './nosana_stake.js';
