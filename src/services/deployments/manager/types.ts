import { Response } from 'express';
import { Collection } from 'mongodb';

export const DeploymentStatus = {
  DRAFT: 'DRAFT',
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR',
} as const;

export type DeploymentStatus =
  (typeof DeploymentStatus)[keyof typeof DeploymentStatus];

export type DeploymentDocument = {
  id: string; // Deployment PublicKey
  vault: string; // Vault PublicKey
  market: string; // Market PublicKey
  owner: string; // Owners PublicKey
  name: string;
  status: DeploymentStatus;
  replicas: number;
  ipfs_definition_hash: string;
  active_jobs: string[];
  past_jobs: string[];
  created_at: Date;
  updated_at: Date;
};

export type EventDocument = {
  category: 'Deployment' | 'Event';
  type: string;
  message: string;
  created_at: Date;
};

export type VaultDocument = {
  vault: string;
  owner: string;
  sol: number;
  nos: number;
  nos_ata: string;
  created_at: Date;
  updated_at: Date;
};

export type DeploymentsResponse<ResponseBody extends {} = any> =
  Response<ResponseBody> & {
    locals: {
      db: {
        deployments: Collection<DeploymentDocument>;
        events: Collection<EventDocument>;
        vaults: Collection<VaultDocument>;
      };
    };
  };
