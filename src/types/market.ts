import { PublicKey } from "@solana/web3.js";
import { EnumValues } from "./utils.js";

export const marketQueue = {
  "JOB_QUEUE": 0,
  "NODE_QUEUE": 1,
  "EMPTY": undefined
} as const

export type MarketQueue = EnumValues<typeof marketQueue>

export type Market = {
  address: PublicKey;
  authority: PublicKey;
  jobExpiration: number;
  jobPrice: number;
  jobTimeout: number;
  jobType: number;
  vault: PublicKey;
  vaultBump: number;
  nodeAccessKey: PublicKey;
  nodeXnosMinimum: number;
  queueType: MarketQueue;
  queue: Array<PublicKey>;
};
