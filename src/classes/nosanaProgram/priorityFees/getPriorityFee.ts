import { SolanaConfig } from '../../../client.js';
import { getFeePrecentiles } from './getPercentileFee.js';
import { getRecentPrioritizationFees } from './getRecentPrioritizationFees.js';

export const getPriorityFee = async (solanaConfig: SolanaConfig): Promise<number> => {
  const {
    network: NETWORK,
    priority_fee: MINIMUM_PRIORITY_FEE = 0,
    priorityFeeStrategy: PRIORITY_FEE_STRATEGY = 'medium',
    maximumPriorityFee: MAXIMUM_PRIORITY_FEE = 50000000,
    dynamicPriorityFee: DYNAMIC_PRIORITY_FEE = false,
  } = solanaConfig;

  if (MAXIMUM_PRIORITY_FEE < MINIMUM_PRIORITY_FEE) {
    throw new Error('Maximum priority fee cannot be less than priority fee');
  }

  if (!DYNAMIC_PRIORITY_FEE) {
    return MINIMUM_PRIORITY_FEE;
  }

  try {
    const fees = await getRecentPrioritizationFees(NETWORK);

    if (fees.length === 0) {
      console.log(
        `No recent fees found, using static fee - Raw: ${MINIMUM_PRIORITY_FEE}, After limits: ${MINIMUM_PRIORITY_FEE} microLamports`,
      );
      return MINIMUM_PRIORITY_FEE;
    }

    const selectedFee = getFeePrecentiles(fees, PRIORITY_FEE_STRATEGY);

    // Apply limits
    const finalFee = Math.min(
      Math.max(selectedFee, MINIMUM_PRIORITY_FEE),
      MAXIMUM_PRIORITY_FEE,
    );
    if (finalFee !== selectedFee && typeof window !== 'undefined') {
      console.log(
        `Fee adjusted from ${selectedFee} to ${finalFee} to meet limits (${MINIMUM_PRIORITY_FEE} - ${MAXIMUM_PRIORITY_FEE})`,
      );
    }
    return finalFee;
  } catch (err) {
    console.error('Priority fee error:', err);
    console.warn(
      `Falling back to static priority fee - Raw: ${MINIMUM_PRIORITY_FEE}, After limits: ${MINIMUM_PRIORITY_FEE} microLamports`,
    );
    return MINIMUM_PRIORITY_FEE;
  }
};
