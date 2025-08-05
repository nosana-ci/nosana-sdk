export function errorFormatter(
  customMessage: string,
  errorObject?: any | undefined,
): Error {
  const { error } = errorObject;
  if (error) {
    return new Error(`${customMessage}: ${error}`);
  }
  return new Error(customMessage);
}
