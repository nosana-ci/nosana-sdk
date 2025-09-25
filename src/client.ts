import { Keypair } from '@solana/web3.js';

import {
  IPFS,
  AuthorizationManager,
  Deployments,
  SolanaManager,
  Jobs,
  ApiJobs,
  Nodes,
  Stake,
  Swap,
  createDeployments,
} from './services/index.js';
import { KeyWallet, polyfill } from './utils.js';

import type { ClientConfig, Wallet } from './types/index.js';

export * from './types/index.js';
export * from './utils.js';
export {
  type Deployment,
  type Vault,
  type TopupVaultOptions,
  type CreateDeployment,
  DeploymentStrategy,
  DeploymentStatus,
} from './services/deployments/types.js';

polyfill();

export class Client {
  authorization: AuthorizationManager;
  deployments: Deployments;
  solana: SolanaManager;
  ipfs: IPFS;
  jobs: Jobs;
  apiJobs?: ApiJobs;
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

    this.authorization = new AuthorizationManager(wallet);
    this.solana = new SolanaManager(environment, wallet, config?.solana);
    this.ipfs = new IPFS(environment, config?.ipfs);
    this.jobs = new Jobs(environment, wallet, config?.solana, this.ipfs);
    this.nodes = new Nodes(environment, wallet, config?.solana);
    this.stake = new Stake(environment, wallet, config?.solana);
    this.swap = new Swap(environment, wallet, config?.solana);
    this.deployments = createDeployments(
      environment,
      wallet,
      config?.solana,
      config?.deployments,
    );

    if (config?.apiKey) {
      this.apiJobs = new ApiJobs(environment, config?.apiJobs, config.apiKey);
    }
  }
}
