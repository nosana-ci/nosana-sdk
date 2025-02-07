export const getPercentileFee = (
  fees: Array<{ prioritizationFee: number }>,
  percentile: number,
): number => {
  const index = Math.min(
    Math.floor(fees.length * (percentile / 100)),
    fees.length - 1,
  );
  return fees[index]?.prioritizationFee || 0;
};
