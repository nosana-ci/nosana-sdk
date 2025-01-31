import { Keypair } from '@solana/web3.js';
import { Wallet as AnchorWallet } from '@coral-xyz/anchor';

export type Wallet = AnchorWallet | string | Keypair | Iterable<number>;

export * from './config.js';
export * from './nosana_jobs.js';
export * from './job.js';
export * from './node.js';
export * from './nosana_nodes.js';
export * from './market.js';
export * from './run.js';
export * from './nosana_stake.js';
