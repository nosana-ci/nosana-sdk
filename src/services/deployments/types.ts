import { PublicKey } from '@solana/web3.js';

import { components } from './client/index.js';

export type DeploymentState = {
  id: string;
  name: string;
  market: PublicKey;
  owner: PublicKey;
  timeout: number;
  replicas: number;
  status: DeploymentStatus;
  ipfs_definition_hash: string;
  // @ts-ignore
  endpoints: components['schemas']['Endpoint'][];
  events: components['schemas']['Events'][];
  jobs: components['schemas']['Jobs'][];
  updated_at: Date;
  created_at: Date;
} & (
    | {
      strategy: 'SCHEDULED';
      schedule: string;
    }
    | {
      strategy: Exclude<DeploymentStrategy, 'SCHEDULED'>;
      schedule?: never;
    }
  );

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
  updateReplicaCount: (replicas: number) => Promise<void>;
  updateTimeout: (timeout: number) => Promise<void>;
  generateAuthHeader: () => Promise<string>;
};

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


