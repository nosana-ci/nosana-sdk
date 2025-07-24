export function errorFormatter(
  customMessage: string,
  errorObject: { error: string } | undefined,
) {
  if (errorObject?.error) {
    throw new Error(`${customMessage}: ${errorObject.error}`);
  }
  throw new Error(customMessage);
}
