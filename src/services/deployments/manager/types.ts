import { Response } from 'express';
import { Collection } from 'mongodb';

export const DeploymentStatus = {
  DRAFT: 'DRAFT',
  ERROR: 'ERROR',
  STARTING: 'STARTING',
  RUNNING: 'RUNNING',
  STOPPING: 'STOPPING',
  STOPPED: 'STOPPED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  ARCHIVED: 'ARCHIVED',
} as const;

export type DeploymentStatus =
  (typeof DeploymentStatus)[keyof typeof DeploymentStatus];

export const DeploymentStrategy = {
  SIMPLE: 'SIMPLE',
  'SIMPLE-EXTEND': 'SIMPLE-EXTEND',
  SCHEDULED: 'SCHEDULED',
  INFINITE: 'INFINITE',
} as const;

export type DeploymentStrategy =
  (typeof DeploymentStrategy)[keyof typeof DeploymentStrategy];

export type DeploymentDocument = {
  id: string; // Deployment PublicKey
  vault: string; // Vault PublicKey
  market: string; // Market PublicKey
  owner: string; // Owners PublicKey
  name: string;
  status: DeploymentStatus;
  strategy: DeploymentStrategy;
  ipfs_definition_hash: string;
  replicas: number;
  timeout: number;
  created_at: Date;
  updated_at: Date;
};

export type EventDocument = {
  category: 'Deployment' | 'Event';
  type: string;
  message: string;
  created_at: Date;
};

export const VaultStatus = {
  OPEN: 'OPEN',
  ARCHIVED: 'ARCHIVED',
} as const;

export type VaultStatus = (typeof VaultStatus)[keyof typeof VaultStatus];

export type VaultDocument = {
  vault: string;
  owner: string;
  status: VaultStatus;
  sol: number;
  nos: number;
  nos_ata: string;
  created_at: Date;
  updated_at: Date;
};

export type Collections = {
  deployments: Collection<DeploymentDocument>;
  events: Collection<EventDocument>;
  vaults: Collection<VaultDocument>;
};

export type DeploymentsResponse<ResponseBody extends {} = any> =
  Response<ResponseBody> & {
    locals: {
      db: Collections;
      deployment: DeploymentDocument;
    };
  };

export type VaultsResponse<ResponseBody extends {} = any> =
  Response<ResponseBody> & {
    locals: {
      db: Collections;
      vault: VaultDocument;
    };
  };

export const TaskType = {
  LIST: 'LIST',
  EXTEND: 'EXTEND',
  STOP: 'STOP',
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export type TaskDocument = {
  task: TaskType;
  due_at: Date;
  deploymentId: string;
  tx: string | undefined;
  created_at: Date;
};
