import { Keypair } from '@solana/web3.js';

import {
  IPFS,
  AuthorizationManager,
  Deployments,
  SolanaManager,
  SecretManager,
  Jobs,
  Nodes,
  Stake,
  Swap,
} from './services/index.js';
import { Config } from './config.js';
import { KeyWallet, polyfill } from './utils.js';

import type { ClientConfig, Wallet } from './types/index.js';

export * from './types/index.js';
export * from './utils.js';

polyfill();

export class Client {
  authorization: AuthorizationManager;
  deployments: typeof Deployments;
  solana: SolanaManager;
  ipfs: IPFS;
  secrets: SecretManager;
  jobs: Jobs;
  nodes: Nodes;
  stake: Stake;
  swap: Swap;

  constructor(
    environment: 'devnet' | 'mainnet' = 'devnet',
    wallet?: Wallet,
    config?: Partial<ClientConfig>,
  ) {
    if (!wallet) {
      wallet = process?.env?.SOLANA_WALLET || new KeyWallet(Keypair.generate());
    }

    new Config(environment, config);

    this.authorization = new AuthorizationManager(wallet);
    this.deployments = deployments;
    this.solana = new SolanaManager(wallet);
    this.ipfs = new IPFS();
    this.secrets = new SecretManager(wallet);
    this.jobs = new Jobs(wallet);
    this.nodes = new Nodes(wallet);
    this.stake = new Stake(wallet);
    this.swap = new Swap(wallet);
  }
}
