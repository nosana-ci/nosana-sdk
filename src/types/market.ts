import { PublicKey } from "@solana/web3.js";
import { EnumValues } from "./utils.js";

export const MarketQueue = {
  "JOB_QUEUE": 0,
  "NODE_QUEUE": 1,
  "EMPTY": undefined
} as const

export type QueueType = EnumValues<typeof MarketQueue>

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
  queueType: QueueType;
  queue: Array<PublicKey>;
};
