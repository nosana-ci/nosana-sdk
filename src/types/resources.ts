export type S3Base = {
  type: 'S3';
  target: string;
  url?: string;
  allowWrite?: boolean;
  files?: string[]; // allow files in base
  IAM?: S3Auth;
  // No bucket, no buckets
};

export type S3WithBucket = {
  type: 'S3';
  target: string;
  bucket: string;
  url?: string;
  allowWrite?: boolean;
  IAM?: S3Auth;
  // No buckets, no files
};

export type S3WithBuckets = {
  type: 'S3';
  target: string;
  buckets: { url: string; files?: string[] }[];
  url?: string;
  allowWrite?: boolean;
  IAM?: S3Auth;
  // No bucket, no files
};

export type S3Unsecure =
  | S3Base
  | S3WithBucket
  | S3WithBuckets;

export type S3Auth = {
  REGION: string;
  ACCESS_KEY_ID: string;
  SECRET_ACCESS_KEY: string;
};

export type ResourceBase = {
  type: 'S3' | 'HF' | 'Ollama';
  target: string;
};

export type HFResource = {
  type: 'HF';
  target: string;
  repo: string;
  revision?: string;
  files?: string[];
  accessToken?: string;
};

export type OllamaResource = {
  type: 'Ollama';
  model: string;
  target?: string;
};

export type S3Resource = S3Unsecure;
export type Resource = S3Resource | HFResource | OllamaResource;

export type RequiredResource = Omit<Resource, 'target'>;