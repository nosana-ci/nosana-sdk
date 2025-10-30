import { operations } from "../../client/index.js";

export type ListJobWithCreditsRequest = operations['postApiJobsCreate-with-credits']['requestBody']['content']['application/json']
export type ExtendJobWithCreditsRequest = operations['postApiJobsExtend-with-credits']['requestBody']['content']['application/json']
export type StopJobWithCreditsRequest = operations['postApiJobsStop-with-credits']['requestBody']['content']['application/json']

export type GetJobByAddressResponse = operations['getApiJobsByAddress']['responses'][200]['content']['application/json']
export type ListJobWithCreditsResponse = operations['postApiJobsCreate-with-credits']['responses'][200]['content']['application/json']
export type ExtendJobWithCreditsResponse = operations['postApiJobsExtend-with-credits']['responses'][200]['content']['application/json']
export type StopJobWithCreditsResponse = operations['postApiJobsStop-with-credits']['responses'][200]['content']['application/json']

export type Balance = operations['getApiCreditsBalance']['responses'][200]['content']['application/json']