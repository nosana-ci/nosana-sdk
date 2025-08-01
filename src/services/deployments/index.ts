import { Wallet as AnchorWallet } from '@coral-xyz/anchor';

import { clientSelector, QueryClient } from './client/index.js';
import { Deployment } from './deployment/index.js';
import { getWallet } from '../../utils.js';
import { errorFormatter } from '../../utils/errorFormatter.js';

import type { Wallet } from '../../types/index.js';
import { Config } from '../../config.js';
import { components } from './client/schema.js';

export class Deployments {
  private client: QueryClient;
  private wallet: AnchorWallet;
  private solana_network: string;
  private nos_address: string;

  constructor(wallet: Wallet) {
    this.wallet = getWallet(wallet);
    this.client = clientSelector(wallet);

    // TODO: swap to prop drilling
    const config = new Config();
    this.solana_network = config.solanaConfig.network;
    this.nos_address = config.solanaConfig.nos_address;
  }

  async create(deploymentBody: components['schemas']['DeploymentCreateBody']) {
    const { data, error } = await this.client.POST('/api/deployment/create', {
      body: deploymentBody,
    });

    if (error || !data) {
      errorFormatter('Error creating deployment', error);
      return;
    }

    console.log(data);

    // return new Deployment(
    //   this.wallet,
    //   data,
    //   this.solana_network,
    //   this.nos_address,
    // );
  }

  async get(deployment: string) {
    const { data, error } = await this.client.GET(
      '/api/deployment/{deployment}',
      {
        params: {
          path: {
            deployment,
          },
        },
      },
    );

    if (error || !data) {
      errorFormatter('Error getting deployment', error);
      return;
    }

    console.log(data);

    // return new Deployment(
    //   this.wallet,
    //   data,
    //   this.solana_network,
    //   this.nos_address,
    // );
  }

  async list() {
    const { data, error } = await this.client.GET('/api/deployments', {});

    if (error || !data) {
      errorFormatter('Error listing deployments', error);
      return;
    }

    console.log(data);

    // return data.map(
    //   (deployment: any) =>
    //     new Deployment(
    //       this.wallet,
    //       deployment,
    //       this.solana_network,
    //       this.nos_address,
    //     ),
    // );
  }
}
