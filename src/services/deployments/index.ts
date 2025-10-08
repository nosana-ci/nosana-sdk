import { getWallet } from '../../utils.js';
import type { components } from './client/schema.js';
import { createDeploymentClient } from './client/index.js';
import { errorFormatter } from '../../utils/errorFormatter.js';
import { deploymentsConfigPreset, solanaConfigPreset } from '../../config.js';
import { createDeployment } from './deployment/createDeployment.js';

import type {
  DeploymentsConfig,
  SolanaConfig,
  Wallet,
} from '../../types/index.js';
import type { CreateDeployment, Deployment } from './types.js';

export interface Deployments {
  create: (deploymentBody: CreateDeployment) => Promise<Deployment>;
  get: (deployment: string) => Promise<Deployment>;
  list: () => Promise<Deployment[]>;
  pipe: (
    deploymentIDorCreateObject: string | CreateDeployment,
    ...actions: Array<(deployment: Deployment) => Promise<any> | any>
  ) => Promise<Deployment>;
  vaults: {
    create: () => Promise<components['schemas']['Vault']>;
    list: () => Promise<components['schemas']['Vault'][]>;
  }
}

export function createDeployments(
  environment: 'devnet' | 'mainnet',
  wallet: Wallet,
  solanaConfig: Partial<SolanaConfig> | undefined,
  deploymentsConfig: Partial<DeploymentsConfig> | undefined,
) {
  const solanaPreset = solanaConfigPreset[environment];
  const deploymentsPreset = deploymentsConfigPreset[environment];
  Object.assign(solanaPreset, solanaConfig);
  Object.assign(deploymentsPreset, deploymentsConfig);

  const anchorWallet = getWallet(wallet);
  const client = createDeploymentClient(wallet, deploymentsPreset);

  if (!wallet) {
    throw new Error('Wallet is required to create deployments');
  }

  const create = async (
    deploymentBody: CreateDeployment,
  ): Promise<Deployment> => {
    const { data, error } = await client.POST('/api/deployment/create', {
      body: deploymentBody,
    });

    if (error || !data) {
      throw errorFormatter('Error creating deployment', error);
    }

    return createDeployment(data, {
      client,
      wallet: anchorWallet,
      solanaConfig: solanaPreset,
    });
  };

  const get = async (deployment: string): Promise<Deployment> => {
    const { data, error } = await client.GET('/api/deployment/{deployment}', {
      params: {
        path: {
          deployment,
        },
      },
    });

    if (error || !data) {
      throw errorFormatter('Error getting deployment', error);
    }

    return createDeployment(data, {
      client,
      wallet: anchorWallet,
      solanaConfig: solanaPreset,
    });
  };

  const list = async (): Promise<Deployment[]> => {
    const { data, error } = await client.GET('/api/deployments', {});

    if (error || !data) {
      throw errorFormatter('Error listing deployments', error);
    }

    return data.map((deployment: components['schemas']['Deployment']) => {
      return createDeployment(deployment, {
        client,
        wallet: anchorWallet,
        solanaConfig: solanaPreset,
      });
    });
  };

  const pipe = async (
    deploymentIDorCreateObject:
      | string
      | components['schemas']['DeploymentCreateBody'],
    ...actions: Array<(deployment: Deployment) => Promise<any> | any>
  ): Promise<Deployment> => {
    let deployment: Deployment;

    if (typeof deploymentIDorCreateObject === 'string') {
      deployment = await get(deploymentIDorCreateObject);
    } else {
      deployment = await create(deploymentIDorCreateObject);
    }

    if (!deployment) {
      throw new Error('Deployment not found or created');
    }

    for (const action of actions) {
      await action(deployment);
    }

    return deployment;
  };

  const createVault = async () => {
    const { data, error } = await client.POST('/api/vault/create', {});

    if (error || !data) {
      throw errorFormatter('Error creating vault', error);
    }

    return data;
  }

  const listVaults = async () => {
    const { data, error } = await client.GET('/api/vaults', {});

    if (error || !data) {
      throw errorFormatter('Error listing vaults', error);
    }

    return data;
  }

  return {
    create,
    get,
    list,
    pipe,
    vaults: {
      create: createVault,
      list: listVaults
    }
  };
}
