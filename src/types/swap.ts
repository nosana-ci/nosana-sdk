/**
 *
 * @interface PlatformFee
 */
interface PlatformFee {
  /**
   *
   * @type {string}
   * @memberof PlatformFee
   */
  amount: string;
  /**
   *
   * @type {number}
   * @memberof PlatformFee
   */
  feeBps: number;
}

/**
 *
 * @interface SwapInfo
 */
interface SwapInfo {
  /**
   *
   * @type {string}
   * @memberof SwapInfo
   */
  ammKey: string;
  /**
   *
   * @type {string}
   * @memberof SwapInfo
   */
  label: string;
  /**
   *
   * @type {string}
   * @memberof SwapInfo
   */
  inputMint: string;
  /**
   *
   * @type {string}
   * @memberof SwapInfo
   */
  outputMint: string;
  /**
   *
   * @type {string}
   * @memberof SwapInfo
   */
  inAmount: string;
  /**
   *
   * @type {string}
   * @memberof SwapInfo
   */
  outAmount: string;
  /**
   *
   * @type {string}
   * @memberof SwapInfo
   */
  feeAmount: string;
  /**
   *
   * @type {string}
   * @memberof SwapInfo
   */
  feeMint: string;
}

/**
 *
 * @interface RoutePlanStep
 */
interface RoutePlanStep {
  /**
   *
   * @type {SwapInfo}
   * @memberof RoutePlanStep
   */
  swapInfo: SwapInfo;
  /**
   *
   * @type {number}
   * @memberof RoutePlanStep
   */
  percent: number;
}

/**
 *
 */
const SwapMode = {
  ExactIn: 'ExactIn',
  ExactOut: 'ExactOut',
} as const;
export type SwapMode = (typeof SwapMode)[keyof typeof SwapMode];

/**
 *
 * @export
 * @interface QuoteResponse
 */
export interface QuoteResponse {
  /**
   *
   * @type {string}
   * @memberof QuoteResponse
   */
  inputMint: string;
  /**
   *
   * @type {string}
   * @memberof QuoteResponse
   */
  inAmount: string;
  /**
   *
   * @type {string}
   * @memberof QuoteResponse
   */
  outputMint: string;
  /**
   *
   * @type {string}
   * @memberof QuoteResponse
   */
  outAmount: string;
  /**
   *
   * @type {string}
   * @memberof QuoteResponse
   */
  otherAmountThreshold: string;
  /**
   *
   * @type {SwapMode}
   * @memberof QuoteResponse
   */
  swapMode: SwapMode;
  /**
   *
   * @type {number}
   * @memberof QuoteResponse
   */
  slippageBps: number;
  /**
   *
   * @type {number}
   * @memberof QuoteResponse
   */
  computedAutoSlippage?: number;
  /**
   *
   * @type {PlatformFee}
   * @memberof QuoteResponse
   */
  platformFee?: PlatformFee;
  /**
   *
   * @type {string}
   * @memberof QuoteResponse
   */
  priceImpactPct: string;
  /**
   *
   * @type {Array<RoutePlanStep>}
   * @memberof QuoteResponse
   */
  routePlan: Array<RoutePlanStep>;
  /**
   *
   * @type {number}
   * @memberof QuoteResponse
   */
  contextSlot?: number;
  /**
   *
   * @type {number}
   * @memberof QuoteResponse
   */
  timeTaken?: number;
  /**
   *
   * @type {string}
   * @memberof QuoteResponse
   */
  swapUsdValue?: string;
  /**
   *
   * @type {boolean}
   * @memberof QuoteResponse
   */
  simplerRouteUsed?: boolean;
}

/**
 *
 * @interface SwapResponsePrioritizationTypeJito
 */
interface SwapResponsePrioritizationTypeJito {
  /**
   *
   * @type {number}
   * @memberof SwapResponsePrioritizationTypeJito
   */
  lamports?: number;
}

/**
 *
 * @interface SwapResponsePrioritizationTypeComputeBudget
 */
interface SwapResponsePrioritizationTypeComputeBudget {
  /**
   *
   * @type {number}
   * @memberof SwapResponsePrioritizationTypeComputeBudget
   */
  estimatedMicroLamports?: number;
  /**
   *
   * @type {number}
   * @memberof SwapResponsePrioritizationTypeComputeBudget
   */
  microLamports?: number;
}

/**
 * The type of prioritization used for the swap, either Jito or ComputeBudget.
 * @interface SwapResponsePrioritizationType
 */
interface SwapResponsePrioritizationType {
  /**
   *
   * @type {SwapResponsePrioritizationTypeJito}
   * @memberof SwapResponsePrioritizationType
   */
  jito?: SwapResponsePrioritizationTypeJito;
  /**
   *
   * @type {SwapResponsePrioritizationTypeComputeBudget}
   * @memberof SwapResponsePrioritizationType
   */
  computeBudget?: SwapResponsePrioritizationTypeComputeBudget;
}

/**
 *
 * @interface SwapRequestDynamicSlippage
 */
interface SwapRequestDynamicSlippage {
  /**
   *
   * @type {number}
   * @memberof SwapRequestDynamicSlippage
   */
  minBps?: number;
  /**
   *
   * @type {number}
   * @memberof SwapRequestDynamicSlippage
   */
  maxBps?: number;
}

/**
 *
 */
const SwapResponseDynamicSlippageReportCategoryNameEnum = {
  Stable: 'stable',
  Lst: 'lst',
  Bluechip: 'bluechip',
  Verified: 'verified',
} as const;
type SwapResponseDynamicSlippageReportCategoryNameEnum =
  (typeof SwapResponseDynamicSlippageReportCategoryNameEnum)[keyof typeof SwapResponseDynamicSlippageReportCategoryNameEnum];

/**
 *
 * @interface SwapResponseDynamicSlippageReport
 */
interface SwapResponseDynamicSlippageReport {
  /**
   *
   * @type {string}
   * @memberof SwapResponseDynamicSlippageReport
   */
  amplificationRatio?: string;
  /**
   *
   * @type {number}
   * @memberof SwapResponseDynamicSlippageReport
   */
  otherAmount?: number;
  /**
   *
   * @type {number}
   * @memberof SwapResponseDynamicSlippageReport
   */
  simulatedIncurredSlippageBps?: number;
  /**
   *
   * @type {number}
   * @memberof SwapResponseDynamicSlippageReport
   */
  slippageBps?: number;
  /**
   *
   * @type {string}
   * @memberof SwapResponseDynamicSlippageReport
   */
  categoryName?: SwapResponseDynamicSlippageReportCategoryNameEnum;
  /**
   *
   * @type {number}
   * @memberof SwapResponseDynamicSlippageReport
   */
  heuristicMaxSlippageBps?: number;
}

/**
 *
 * @export
 * @interface SwapResponse
 */
export interface SwapResponse {
  /**
   *
   * @type {string}
   * @memberof SwapResponse
   */
  swapTransaction: string;
  /**
   *
   * @type {number}
   * @memberof SwapResponse
   */
  lastValidBlockHeight: number;
  /**
   *
   * @type {number}
   * @memberof SwapResponse
   */
  prioritizationFeeLamports: number;
  /**
   *
   * @type {SwapResponsePrioritizationType}
   * @memberof SwapResponse
   */
  prioritizationType?: SwapResponsePrioritizationType;
  /**
   *
   * @type {SwapResponseDynamicSlippageReport}
   * @memberof SwapResponse
   */
  dynamicSlippageReport?: SwapResponseDynamicSlippageReport;
}
