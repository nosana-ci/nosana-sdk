import { getWallet } from '../../utils.js';
import { components } from './client/schema.js';
import { clientSelector } from './client/index.js';
import { errorFormatter } from '../../utils/errorFormatter.js';
import { deploymentsConfigPreset, solanaConfigPreset } from '../../config.js';
import {
  createDeployment,
  type Deployment,
} from './deployment/createDeployment.js';

import type {
  DeploymentsConfig,
  SolanaConfig,
  Wallet,
} from '../../types/index.js';

export interface Deployments {
  create: (
    deploymentBody: components['schemas']['DeploymentCreateBody'],
  ) => Promise<Deployment>;
  get: (deployment: string) => Promise<Deployment>;
  list: () => Promise<Deployment[]>;
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
  const client = clientSelector(wallet, deploymentsPreset);

  if (!wallet) {
    throw new Error('Wallet is required to create deployments');
  }

  const create = async (
    deploymentBody: components['schemas']['DeploymentCreateBody'],
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

  return {
    create,
    get,
    list,
  };
}
