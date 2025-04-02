type S3Base = {
  type: 'S3';
  url?: string;
  target: string;
  files?: string[];
  allowWrite?: boolean;
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

export type S3Secure = S3Unsecure & {
  IAM: S3Auth;
};

export type HFResource = {
  type: 'HF';
  repo: string;
  revision?: string;
  accessToken?: string;
};

export type Resource = S3Unsecure | S3Secure | HFResource;

export type RequiredResource = Omit<Resource, 'target'>;
