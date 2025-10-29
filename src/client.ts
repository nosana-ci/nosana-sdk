import { Keypair } from '@solana/web3.js';

import {
  IPFS,
  AuthorizationManager,
  Deployments,
  DeploymentsApi,
  SolanaManager,
  Jobs,
  Nodes,
  Stake,
  Swap,
  Api,
  createDeployments,
  createApi,
} from './services/index.js';
import { KeyWallet, polyfill } from './utils.js';

import type { ClientConfig, Wallet } from './types/index.js';
import { createNosanaApiClient } from './client/index.js';

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

type HasApiKey<T> = T extends { apiKey: string } ? true : false;

export class Client<TConfig extends Partial<ClientConfig> = {}> {
  authorization: AuthorizationManager;
  deployments: HasApiKey<TConfig> extends true ? DeploymentsApi : Deployments;
  solana: SolanaManager;
  ipfs: IPFS;
  jobs: Jobs;
  nodes: Nodes;
  stake: Stake;
  swap: Swap;
  api: Api;

  constructor(
    environment: 'devnet' | 'mainnet' = 'devnet',
    wallet?: Wallet,
    config?: TConfig,
  ) {
    if (!wallet) {
      wallet = process?.env?.SOLANA_WALLET || new KeyWallet(Keypair.generate());
    }
    const apiKey = config?.apiKey;
    const client = createNosanaApiClient(environment, wallet, config);

    this.authorization = new AuthorizationManager(wallet);
    this.solana = new SolanaManager(environment, wallet, config?.solana);
    this.ipfs = new IPFS(environment, config?.ipfs);
    this.jobs = new Jobs(environment, wallet, config?.solana, this.ipfs);
    this.nodes = new Nodes(environment, wallet, config?.solana);
    this.stake = new Stake(environment, wallet, config?.solana);
    this.swap = new Swap(environment, wallet, config?.solana);
    this.deployments = (apiKey !== undefined
      ? createDeployments(environment, client, wallet, config?.solana, true)
      : createDeployments(environment, client, wallet, config?.solana, false)) as HasApiKey<TConfig> extends true ? DeploymentsApi : Deployments;

    this.api = createApi(client);
  }
}