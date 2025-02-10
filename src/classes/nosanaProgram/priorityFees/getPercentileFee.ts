type PRIORITY_FEE_STRATEGY =
  | 'min'
  | 'low'
  | 'medium'
  | 'high'
  | 'veryHigh'
  | 'unsafeMax';

function getPercentileFee(
  fees: Array<{ prioritizationFee: number }>,
  percentile: number,
): number {
  const index = Math.min(
    Math.floor(fees.length * (percentile / 100)),
    fees.length - 1,
  );
  return fees[index]?.prioritizationFee || 0;
}

export function getFeePrecentiles(
  fees: Array<{ prioritizationFee: number }>,
  strategy: PRIORITY_FEE_STRATEGY,
) {
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

  return feeLevels[strategy] ?? feeLevels.medium;
}
