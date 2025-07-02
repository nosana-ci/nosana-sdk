import { PublicKey } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

import { Vault } from '../vault';
import { clientSelector, QueryClient } from '../client';
import { errorFormatter } from '../../../utils/errorFormatter';
import { AutoDestructurable } from '../../../classes/autoDestructurable';

import {
  DeploymentDocument,
  DeploymentStatus,
  DeploymentStrategy,
} from '../manager/types';

export class Deployment extends AutoDestructurable {
  public readonly id!: string;
  public readonly market!: PublicKey;
  public readonly owner!: PublicKey;
  public readonly name!: string;
  public readonly strategy!: DeploymentStrategy;
  // TODO: Project against outside updates and fix type issues forcing !
  public status!: DeploymentStatus;
  public replicas!: number;
  public timeout!: number;
  public ipfs_definition_hash!: string;
  public active_jobs!: string[];
  public past_jobs!: string[];
  public updated_at!: Date;
  public readonly created_at!: Date;
  public readonly vault: Vault;

  private readonly client: QueryClient;

  constructor(wallet: Wallet, deployment: DeploymentDocument) {
    super(
      (name) =>
        `Cannot call ${name}, deployment is archived and cannot be modified.`,
    );
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
    if (
      (
        [
          DeploymentStatus.STARTING,
          DeploymentStatus.RUNNING,
        ] as DeploymentStatus[]
      ).includes(this.status)
    ) {
      errorFormatter('Cannot start a deployment that is already running.', {});
    }
    const { error } = await this.client.POST(
      `/deployment/${this.id}/start`,
      {},
    );

    if (error) {
      errorFormatter('Error starting deployment', error);
    }

    this.status = DeploymentStatus.STARTING;
  }

  async updateTimeout(timeout: number): Promise<void> {
    const { data, error } = await this.client.PATCH(
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

    this.timeout = data.timeout;
    this.updated_at = data.updated_at;
  }

  async stop() {
    const { data, error } = await this.client.POST(
      `/deployment/${this.id}/stop`,
      {},
    );

    if (error) {
      errorFormatter(`Error stopping deployment`, error);
    }

    this.status = DeploymentStatus.STOPPING;
    this.updated_at = data.updated_at;
  }

  async archive() {
    const { error } = await this.client.PATCH(
      `/deployment/${this.id}/archive`,
      {},
    );

    if (error) {
      errorFormatter('Error deleting deployment', error);
    }

    this.status = DeploymentStatus.ARCHIVED;
    super.freeze();
  }
}
