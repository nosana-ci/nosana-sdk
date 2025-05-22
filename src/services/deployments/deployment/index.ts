import { PublicKey } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

import { DeploymentDocument, DeploymentStatus } from '../manager/types';
import { Vault } from '../vault';
import { clientSelector, QueryClient } from '../client';
import { errorFormatter } from '../../../utils/errorFormatter';
import { AutoDestructable } from '../../../classes/autoDestructable';

export class Deployment extends AutoDestructable {
  public id!: string;
  public market!: PublicKey;
  public owner!: PublicKey;
  public name!: string;
  public status!: DeploymentStatus;
  public replicas!: number;
  public timeout!: number;
  public ipfs_definition_hash!: string;
  public active_jobs!: string[];
  public past_jobs!: string[];
  public created_at!: Date;
  public updated_at!: Date;
  public vault: Vault;
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

  async delete() {
    const { error } = await this.client.DELETE(`/deployment/${this.id}`, {});

    if (error) {
      errorFormatter('Error deleting deployment', error);
    }

    super.delete();
  }
}
