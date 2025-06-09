export function errorFormatter(
  customMessage: string,
  { error }: any | undefined,
) {
  if (error) {
    throw new Error(`${customMessage}: ${error}`);
  }
  throw new Error(customMessage);
}
