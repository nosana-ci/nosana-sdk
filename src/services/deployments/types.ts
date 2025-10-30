import { PublicKey } from '@solana/web3.js';

import { components, paths } from '../../client/index.js';
import { JobDefinition } from '../../client.js';

export type DeploymentState = Omit<components['schemas']['Deployment'], "updated_at" | "created_at" | "market" | "owner" | "vault"> & {
  market: PublicKey;
  owner: PublicKey;
  updated_at: Date;
  created_at: Date;
}

export type CreateDeployment = components['schemas']['DeploymentCreateBody'];

export interface TopupVaultOptions {
  SOL?: number;
  NOS?: number;
  lamports?: boolean;
}

export interface Vault {
  publicKey: PublicKey;
  getBalance: () => Promise<{ SOL: number; NOS: number }>;
  topup: (options: TopupVaultOptions) => Promise<void>;
  withdraw: () => Promise<void>;
}

export type Deployment = DeploymentState & {
  vault: Vault;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  archive: () => Promise<void>;
  getTasks: () => Promise<components['schemas']['Task'][]>;
  getJob: (job: string) => Promise<paths['/api/deployments/{deployment}/jobs/{job}']['get']['responses']['200']['content']['application/json']>;
  generateAuthHeader: () => Promise<string>;
  createRevision: (jobDefinition: JobDefinition) => Promise<void>;
  updateActiveRevision: (revision: number) => Promise<void>;
  updateReplicaCount: (replicas: number) => Promise<void>;
  updateTimeout: (timeout: number) => Promise<void>;
  updateSchedule: (schedule: string) => Promise<void>;
};

export type ApiDeployment = Omit<Deployment, 'vault'>;

export const DeploymentStatus: {
  [key in components['schemas']['DeploymentStatus']]: components['schemas']['DeploymentStatus'];
} = {
  DRAFT: 'DRAFT',
  ERROR: 'ERROR',
  STARTING: 'STARTING',
  RUNNING: 'RUNNING',
  STOPPING: 'STOPPING',
  STOPPED: 'STOPPED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  ARCHIVED: 'ARCHIVED',
} as const;

export const DeploymentStrategy: {
  [key in components['schemas']['DeploymentStrategy']]: components['schemas']['DeploymentStrategy'];
} = {
  SIMPLE: 'SIMPLE',
  'SIMPLE-EXTEND': 'SIMPLE-EXTEND',
  SCHEDULED: 'SCHEDULED',
  INFINITE: 'INFINITE',
} as const;

export type DeploymentStatus = components['schemas']['DeploymentStatus'];
export type DeploymentStrategy = components['schemas']['DeploymentStrategy'];

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

export interface DeploymentsApi {
  create: (deploymentBody: CreateDeployment) => Promise<ApiDeployment>;
  get: (deployment: string) => Promise<ApiDeployment>;
  list: () => Promise<ApiDeployment[]>;
  pipe: (
    deploymentIDorCreateObject: string | CreateDeployment,
    ...actions: Array<(deployment: ApiDeployment) => Promise<any> | any>
  ) => Promise<ApiDeployment>;
}