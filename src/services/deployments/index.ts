import { getWallet } from '../../utils.js';
import { errorFormatter } from '../../utils/errorFormatter.js';
import { solanaConfigPreset } from '../../config.js';
import { createDeployment } from './deployment/createDeployment.js';

import type {
  SolanaConfig,
  Wallet,
} from '../../types/index.js';
import type { ApiDeployment, CreateDeployment, Deployment, Deployments, DeploymentsApi } from './types.js';
import { QueryClient, components } from '../../client/index.js';

export type { Deployments, DeploymentsApi } from './types.js';

export function createDeployments(environment: 'devnet' | 'mainnet', client: QueryClient, wallet: Wallet, solanaConfig: Partial<SolanaConfig> | undefined, hasApiKey: false): Deployments
export function createDeployments(environment: 'devnet' | 'mainnet', client: QueryClient, wallet: Wallet, solanaConfig: Partial<SolanaConfig> | undefined, hasApiKey: true): DeploymentsApi

export function createDeployments(
  environment: 'devnet' | 'mainnet',
  client: QueryClient,
  wallet: Wallet,
  solana: Partial<SolanaConfig> | undefined,
  hasApiKey: false | true,
) {
  const config = solanaConfigPreset[environment];
  Object.assign(config, solana);

  const anchorWallet = getWallet(wallet);

  const create = async (
    deploymentBody: CreateDeployment,
  ) => {
    const { data, error } = await client.POST('/api/deployments/create', {
      body: deploymentBody,
    });

    if (error || !data) {
      throw errorFormatter('Error creating deployment', error);
    }

    return hasApiKey ? createDeployment(data, {
      client,
      wallet: anchorWallet,
      solanaConfig: config,
    }, true) : createDeployment(data, {
      client,
      wallet: anchorWallet,
      solanaConfig: config,
    }, false);
  };

  const get = async (deployment: string) => {
    const { data, error } = await client.GET('/api/deployments/{deployment}', {
      params: {
        path: {
          deployment,
        },
      },
    });

    if (error || !data) {
      throw errorFormatter('Error getting deployment', error);
    }

    return hasApiKey ? createDeployment(data, {
      client,
      wallet: anchorWallet,
      solanaConfig: config,
    }, true) : createDeployment(data, {
      client,
      wallet: anchorWallet,
      solanaConfig: config,
    }, false);
  };

  const list = async () => {
    const { data, error } = await client.GET('/api/deployments', {});

    if (error || !data) {
      throw errorFormatter('Error listing deployments', error);
    }

    return data.map((deployment: components['schemas']['Deployment']) => {
      return hasApiKey ? createDeployment(deployment, {
        client,
        wallet: anchorWallet,
        solanaConfig: config,
      }, true) : createDeployment(deployment, {
        client,
        wallet: anchorWallet,
        solanaConfig: config,
      }, false);
    });
  };

  const pipe = async (
    deploymentIDorCreateObject:
      | string
      | components['schemas']['DeploymentCreateBody'],
    ...actions: Array<(deployment: any) => Promise<any> | any>
  ) => {
    let deployment: any;

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
    const { data, error } = await client.POST('/api/deployments/vaults/create', {});

    if (error || !data) {
      throw errorFormatter('Error creating vault', error);
    }

    return data;
  }

  const listVaults = async () => {
    const { data, error } = await client.GET('/api/deployments/vaults', {});

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
    ...(!hasApiKey ? {
      vaults: {
        create: createVault,
        list: listVaults
      }
    } : {}),
  };
}
