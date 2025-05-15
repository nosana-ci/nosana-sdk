import { Wallet as AnchorWallet } from '@coral-xyz/anchor';

import { clientSelector, QueryClient } from './client/index.js';
import { Deployment } from './deployment/index.js';
import { DeploymentsManager } from './manager/index.js';
import { getWallet } from '../../utils.js';

import type { Wallet } from '../../types/index.js';
import type {
  DeploymentCreateRequest,
  DeploymentCreateSuccessResponse,
} from './manager/routes/post/deployment/create/deploymentCreate.types.js';

export class Deployments {
  public manager: DeploymentsManager;
  private client: QueryClient;
  private wallet: AnchorWallet;

  constructor(wallet: Wallet) {
    this.wallet = getWallet(wallet);
    this.manager = new DeploymentsManager();
    this.client = clientSelector(wallet);
  }

  private errorFormatter(customMessage: string, { error }: any) {
    throw new Error(`${customMessage}: ${error}`);
  }

  async create(deployment: DeploymentCreateRequest): Promise<Deployment> {
    const { data, error } = await this.client.POST('/deployment/create', {
      body: {
        ...deployment,
      },
    });

    if (error) {
      this.errorFormatter('Error creating deployment', error);
    }

    return new Deployment(this.wallet, data as DeploymentCreateSuccessResponse);
  }

  async get(id: string) {
    const { data, error } = await this.client.GET(`/deployment/{id}`, {
      params: {
        path: {
          id,
        },
      },
    });

    if (error) {
      this.errorFormatter('Error getting deployment', error);
    }

    return new Deployment(this.wallet, data);
  }

  async list() {
    const { data, error } = await this.client.GET('/deployments', {});

    if (error) {
      this.errorFormatter('Error listing deployments', error);
    }

    return data;
  }
}
