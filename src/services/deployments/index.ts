import { Wallet as AnchorWallet } from '@coral-xyz/anchor';

import { clientSelector, QueryClient } from './client/index.js';
import { Deployment } from './deployment/index.js';
import { DeploymentsManager } from './manager/index.js';
import { getWallet } from '../../utils.js';
import { errorFormatter } from '../../utils/errorFormatter.js';

import type { Wallet } from '../../types/index.js';
import type {
  DeploymentCreateRequest,
  DeploymentCreateSuccessResponse,
} from './manager/routes/post/deployments/create/deploymentCreate.types.js';

export class Deployments {
  public manager: DeploymentsManager;
  private client: QueryClient;
  private wallet: AnchorWallet;

  constructor(wallet: Wallet) {
    this.wallet = getWallet(wallet);
    this.manager = new DeploymentsManager();
    this.client = clientSelector(wallet);
  }

  async create(deploymentBody: DeploymentCreateRequest): Promise<Deployment> {
    const { data, error } = await this.client.POST('/deployment/create', {
      body: {
        ...deploymentBody,
      },
    });

    if (error) {
      errorFormatter('Error creating deployment', error);
    }

    return new Deployment(this.wallet, data as DeploymentCreateSuccessResponse);
  }

  async get(deployment: string): Promise<Deployment> {
    const { data, error } = await this.client.GET(`/deployment/{id}`, {
      params: {
        path: {
          id: deployment,
        },
      },
    });

    if (error) {
      errorFormatter('Error getting deployment', error);
    }

    return new Deployment(this.wallet, data as DeploymentCreateSuccessResponse);
  }

  async list(): Promise<Deployment[]> {
    const { data, error } = await this.client.GET('/deployments', {});

    if (error) {
      errorFormatter('Error listing deployments', error);
    }

    return data.map(
      (deployment: DeploymentCreateSuccessResponse) =>
        new Deployment(this.wallet, deployment),
    );
  }

  async archive(deployment: string) {
    const { error } = await this.client.DELETE(
      `/deployment/${deployment}/archive`,
      {},
    );

    if (error) {
      errorFormatter('Error archiving deployment', error);
    }
  }
}
