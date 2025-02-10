import { Keypair } from '@solana/web3.js';

import {
  IPFS,
  AuthorizationManager,
  SolanaManager,
  SecretManager,
  Jobs,
  Nodes,
  Stake,
} from './services/index.js';
import { Config } from './config.js';
import { KeyWallet, polyfill } from './utils.js';

import type { ClientConfig, Wallet } from './types/index.js';

export * from './types/index.js';
export * from './utils.js';

polyfill();

export class Client {
  authorization: AuthorizationManager;
  solana: SolanaManager;
  ipfs: IPFS;
  secrets: SecretManager;
  jobs: Jobs;
  nodes: Nodes;
  stake: Stake;

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
    this.solana = new SolanaManager(wallet);
    this.ipfs = new IPFS();
    this.secrets = new SecretManager(wallet);
    this.jobs = new Jobs(wallet);
    this.nodes = new Nodes(wallet);
    this.stake = new Stake(wallet);
  }
}
