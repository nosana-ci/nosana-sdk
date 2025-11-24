import { operations } from "../../client/index.js";

export type ListJobWithCreditsRequest = operations['postApiJobsList']['requestBody']['content']['application/json']
export type ExtendJobWithCreditsRequest = {
  jobAddress: string;
  seconds?: number;
}
export type StopJobWithCreditsRequest = {
  jobAddress: string;
}

export type GetJobByAddressResponse = operations['getApiJobsByAddress']['responses'][200]['content']['application/json']
export type ListJobWithCreditsResponse = operations['postApiJobsList']['responses'][200]['content']['application/json']
export type ExtendJobWithCreditsResponse = operations['postApiJobsByAddressExtend']['responses'][200]['content']['application/json']
export type StopJobWithCreditsResponse = operations['postApiJobsByAddressStop']['responses'][200]['content']['application/json']

export type Balance = operations['getApiCreditsBalance']['responses'][200]['content']['application/json']