export type S3Unsecure = {
  type: 'S3';
  url?: string;
  target: string;
  files?: string[];
  allowWrite?: boolean;
  buckets?: { url: string; files?: string[] }[];
};

export type S3Auth = {
  REGION: string;
  ACCESS_KEY_ID: string;
  SECRET_ACCESS_KEY: string;
};

export type S3Secure = S3Unsecure & {
  IAM: S3Auth;
};

export type HFResource = {
  repo: string;
  revision?: string;
  accessToken?: string;
};

export type Resource = S3Unsecure | S3Secure | HFResource;

export type RequiredResource = Omit<Resource, 'target'>;
