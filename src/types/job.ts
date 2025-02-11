import { PublicKey } from '@solana/web3.js';
import { IValidation } from 'typia';
import typia from 'typia';
import { Resource } from './resources.js';

export { IValidation };

/************************
 * Job Definition Types *
 ************************/
export type Ops = Array<Operation<OperationType>>;

export type JobDefinition = {
  version: string;
  type: JobType;
  meta?: {
    trigger?: string;
    system_requirments?: {
       [key: string]: number | string
    }
  };
  global?: {
    image?: string;
    gpu?: boolean;
    entrypoint?: string | string[];
    env?: {
      [key: string]: string;
    };
    work_dir?: string;
  };
  ops: Ops;
};
export type JobType = 'container';

export type Operation<T extends OperationType> = {
  type: OperationType;
  id: string;
  args: OperationArgsMap[T];
  results?: OperationResults;
};
export interface OperationArgsMap {
  'container/run': {
    image: string;
    cmd?: string[] | string;
    volumes?: [
      {
        name: string;
        dest: string;
      },
    ];
    expose?: number;
    private?: boolean;
    gpu?: boolean;
    work_dir?: string;
    output?: string;
    entrypoint?: string | string[];
    env?: {
      [key: string]: string;
    };
    required_vram?: number;
    resources?: Resource[];
  };
  'container/create-volume': {
    name: string;
  };
}
export type OperationType = keyof OperationArgsMap;

export type StdOptions = 'stdin' | 'stdout' | 'stderr' | 'nodeerr';

export type OperationResults = {
  [key: string]: string | OperationResult;
};

export type OperationResult = {
  regex: string;
  logType: [StdOptions, StdOptions?, StdOptions?, StdOptions?];
};

/************************
 *   Job Result Types   *
 ************************/
export type FlowState = {
  status: string;
  startTime: number;
  endTime: number | null;
  errors?: Array<any>;
  opStates: Array<OpState>;
  secrets?: {
    [key: string]: string;
  };
};
export type Flow = {
  id: string;
  jobDefinition: JobDefinition;
  state: FlowState;
};

export type Log = {
  type: StdOptions;
  log: string | undefined;
};

export type OpState = {
  providerId: string | null;
  operationId: string | null;
  status: string | null;
  startTime: number | null;
  endTime: number | null;
  exitCode: number | null;
  logs: Array<Log>;
  results?: {
    [key: string]: string | string[];
  };
};

export const validateJobDefinition =
  typia.createValidateEquals<JobDefinition>();

export type Job = {
  ipfsJob: string;
  ipfsResult: string;
  market: PublicKey;
  node: string;
  payer: PublicKey;
  price: number;
  project: PublicKey;
  state: string | number;
  timeEnd: number;
  timeStart: number;
  timeout: number;
};
