import { Response } from 'express';
import { Collection, Document } from 'mongodb';

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

export type DeploymentDocument =
  | ({
      strategy: 'SCHEDULED';
      schedule: string;
    } & DeploymentDocumentBase)
  | ({
      strategy: Exclude<DeploymentStrategy, 'SCHEDULED'>;
      schedule?: never;
    } & DeploymentDocumentBase);

export type DeploymentCollection = Collection<DeploymentDocument>;

export type DeploymentDocumentBase = {
  id: string; // Deployment PublicKey
  vault: string; // Vault PublicKey
  market: string; // Market PublicKey
  owner: string; // Owners PublicKey
  name: string;
  status: DeploymentStatus;
  ipfs_definition_hash: string;
  replicas: number;
  timeout: number;
  created_at: Date;
  updated_at: Date;
};

export type EventDocument = {
  category: 'Deployment' | 'Event';
  deploymentId: string;
  type: string;
  message: string;
  tx?: string | undefined;
  created_at: Date;
};

export type EventsCollection = Collection<EventDocument>;

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

export type VaultCollection = Collection<VaultDocument>;

export type Collections = {
  deployments: DeploymentCollection;
  events: EventsCollection;
  vaults: VaultCollection;
};

export type DeploymentAggregation = DeploymentDocument & {
  events: EventDocument[];
  jobs: JobsDocument[];
};

export type DeploymentsResponse<ResponseBody extends {} = any> =
  Response<ResponseBody> & {
    locals: {
      db: Collections;
      deployment: DeploymentAggregation;
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

export type TasksCollection = Collection<TaskDocument>;

export type JobsDocument = {
  job: string;
  deployment: string;
  run: string;
  tx: string;
  created_at: Date;
};

export interface WorkerEventMessage {
  event: 'CONFIRMED' | string;
  error?: any;
  job: string;
  run: string;
  tx: string;
}

export type OutstandingTasksDocument = Document &
  TaskDocument & {
    deployment: DeploymentDocument;
    jobs: JobsDocument[];
  };
