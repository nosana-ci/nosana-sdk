import { configSelector } from '../../../client';
import { getPercentileFee } from './getPercentileFee';
import { getRecentPrioritizationFees } from './getRecentPrioritizationFees';

export const getPriorityFee = async (): Promise<number> => {
  const {
    network: NETWORK,
    priority_fee: MINIMUM_PRIORITY_FEE = 0,
    priorityFeeStrategy: PRIORITY_FEE_STRATEGY = 'medium',
    maximumPriorityFee: MAXIMUM_PRIORITY_FEE = 50000000,
    dynamicPriorityFee: DYNAMIC_PRIORITY_FEE = false,
  } = configSelector().solanaConfig;

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

    // Sort in ascending order for percentile calculation
    fees.sort((a: any, b: any) => a.prioritizationFee - b.prioritizationFee);

    const feeLevels = {
      min: getPercentileFee(fees, 0), // 0th percentile
      low: getPercentileFee(fees, 25), // 25th percentile
      medium: getPercentileFee(fees, 50), // 50th percentile
      high: getPercentileFee(fees, 70), // 70th percentile
      veryHigh: getPercentileFee(fees, 85), // 85th percentile
      unsafeMax: getPercentileFee(fees, 100), // 100th percentile
    };

    console.log('\nPriority Fees (microLamports):');
    console.log(`  Min (0th): ${feeLevels.min}`);
    console.log(`  Low (25th): ${feeLevels.low}`);
    console.log(`  Medium (50th): ${feeLevels.medium}`);
    console.log(`  High (70th): ${feeLevels.high}`);
    console.log(`  Very High (85th): ${feeLevels.veryHigh}`);
    console.log(`  Unsafe Max (100th): ${feeLevels.unsafeMax}`);

    const selectedFee: number =
      feeLevels[PRIORITY_FEE_STRATEGY] ?? feeLevels.medium;

    // Apply limits
    const finalFee = Math.min(
      Math.max(selectedFee, MINIMUM_PRIORITY_FEE),
      MAXIMUM_PRIORITY_FEE,
    );
    if (finalFee !== selectedFee) {
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
