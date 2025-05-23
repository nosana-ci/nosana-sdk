import { PublicKey } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

import { Vault } from '../vault';
import { clientSelector, QueryClient } from '../client';
import { errorFormatter } from '../../../utils/errorFormatter';
import { AutoDestructable } from '../../../classes/autoDestructable';

import {
  DeploymentDocument,
  DeploymentStatus,
  DeploymentStrategy,
} from '../manager/types';

export class Deployment extends AutoDestructable {
  public readonly id!: string;
  public readonly market!: PublicKey;
  public readonly owner!: PublicKey;
  public readonly name!: string;
  public readonly status!: DeploymentStatus;
  public readonly replicas!: number;
  public readonly timeout!: number;
  public readonly strategy!: DeploymentStrategy;
  public readonly ipfs_definition_hash!: string;
  public readonly active_jobs!: string[];
  public readonly past_jobs!: string[];
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly vault: Vault;
  private client: QueryClient;

  constructor(wallet: Wallet, deployment: DeploymentDocument) {
    super();
    for (let key in deployment) {
      if (key === 'vault') continue;
      if (['market', 'owner'].includes(key)) {
        // @ts-ignore
        this[key] = new PublicKey(deployment[key]);
        continue;
      }
      // @ts-ignore
      this[key] = deployment[key];
    }

    this.client = clientSelector(wallet);
    this.vault = new Vault(new PublicKey(deployment.vault), wallet);

    if (this.status === 'ARCHIVED') {
      super.freeze();
    }
  }

  async start() {
    const { error } = await this.client.POST(
      `/deployment/${this.id}/start`,
      {},
    );

    if (error) {
      errorFormatter('Error starting deployment', error);
    }
  }

  async updateTimeout(timeout: number): Promise<void> {
    const { error } = await this.client.PATCH(
      `/deployment/${this.id}/update-timeout`,
      {
        body: {
          timeout,
        },
      },
    );

    if (error) {
      errorFormatter('Error creating deployment', error);
    }
  }

  async stop() {}

  async archive() {
    const { error } = await this.client.PATCH(
      `/deployment/${this.id}/archive`,
      {},
    );

    if (error) {
      errorFormatter('Error deleting deployment', error);
    }

    super.freeze();
  }
}
