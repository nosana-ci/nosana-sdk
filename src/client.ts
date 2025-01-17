import { Keypair } from '@solana/web3.js';

import { Swap } from './services/swap.js';

import {
  IPFS,
  AuthorizationManager,
  SolanaManager,
  SecretManager,
  Jobs,
  Nodes,
  Stake,
} from './services/index.js';
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
  swap: Swap;

  constructor(
    environment: string = 'devnet',
    wallet?: Wallet,
    config?: Partial<ClientConfig>,
  ) {
    if (!wallet) {
      wallet = process?.env?.SOLANA_WALLET || new KeyWallet(Keypair.generate());
    }

    this.authorization = new AuthorizationManager(wallet);
    this.solana = new SolanaManager(environment, wallet, config?.solana);
    this.ipfs = new IPFS(environment, config?.ipfs);
    this.secrets = new SecretManager(environment, wallet, config?.secrets);
    this.jobs = new Jobs(environment, wallet, config?.solana);
    this.nodes = new Nodes(environment, wallet, config?.solana);
    this.stake = new Stake(environment, wallet, config?.solana);
    this.swap = new Swap(environment, wallet, config?.solana);
  }
}
