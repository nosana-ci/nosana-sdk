import type { ClientConfig } from './types/index.js';
import {
  IPFS,
  SolanaManager,
  SecretManager,
  Jobs,
  Nodes,
  Stake,
} from './services/index.js';
import type { Wallet } from '@coral-xyz/anchor/dist/cjs/provider.js';
import { KeyWallet } from './utils.js';
import { Keypair } from '@solana/web3.js';
import { polyfill } from './utils.js';
export * from './types/index.js';
export * from './utils.js';

polyfill();

export class Client {
  solana: SolanaManager;
  ipfs: IPFS;
  secrets: SecretManager;
  jobs: Jobs;
  nodes: Nodes;
  stake: Stake;

  constructor(
    environment: string = 'devnet',
    wallet?: Wallet | string | Keypair | Iterable<number>,
    config?: Partial<ClientConfig>,
  ) {
    if (!wallet) {
      wallet = process?.env?.SOLANA_WALLET || new KeyWallet(Keypair.generate());
    }

    this.solana = new SolanaManager(environment, wallet, config?.solana);
    this.ipfs = new IPFS(environment, config?.ipfs);
    this.secrets = new SecretManager(environment, wallet, config?.secrets);
    this.jobs = new Jobs(environment, wallet, config?.solana);
    this.nodes = new Nodes(environment, wallet, config?.solana);
    this.stake = new Stake(environment, wallet, config?.solana);
  }
}
