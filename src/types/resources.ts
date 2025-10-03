type S3Base = {
  type: 'S3';
  url?: string;
  target: string;
  files?: string[];
  allowWrite?: boolean;
  IAM?: S3Auth;
};

type S3WithBucket = S3Base & { bucket?: string; buckets?: never };
type S3WithBuckets = S3Base & {
  buckets?: { url: string; files?: string[] }[];
  bucket?: never;
};

export type S3Unsecure = S3WithBucket | S3WithBuckets;

export type S3Auth = {
  REGION: string;
  ACCESS_KEY_ID: string;
  SECRET_ACCESS_KEY: string;
};

export type ResourceBase = {
  type: 'S3' | 'HF' | 'Ollama';
  target: string;
};

export type HFResource = ResourceBase & {
  type: 'HF';
  repo: string;
  revision?: string;
  files?: string[];
  accessToken?: string;
};

export type OllamaResource = Partial<ResourceBase> & {
  type: 'Ollama';
  model: string;
  target?: string
};

export type S3Resource = ResourceBase & S3Unsecure;

export type Resource = S3Resource | HFResource | OllamaResource;

export type RequiredResource = Omit<Resource, 'target'>;