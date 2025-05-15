import { PublicKey } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

import { DeploymentDocument, DeploymentStatus } from '../manager/types';
import { Vault } from '../vault';

export class Deployment {
  public id!: string;
  public market!: PublicKey;
  public owner!: PublicKey;
  public name!: string;
  public status!: DeploymentStatus;
  public replicas!: number;
  public ipfs_definition_hash!: string;
  public active_jobs!: string[];
  public past_jobs!: string[];
  public created_at!: Date;
  public updated_at!: Date;
  public vault: Vault;

  constructor(wallet: Wallet, deployment: DeploymentDocument) {
    this.vault = new Vault(new PublicKey(deployment.vault), 0, 0, wallet);

    for (let key in deployment) {
      if (key === ' vault') continue;
      if (['market', 'owner'].includes(key)) {
        // @ts-ignore
        this[key] = new PublicKey(deployment[key]);
        continue;
      }
      // @ts-ignore
      this[key] = deployment[key];
    }
  }

  async start() {}

  async stop() {}
}
