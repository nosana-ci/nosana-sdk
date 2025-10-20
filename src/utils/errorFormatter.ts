export function errorFormatter(
  customMessage: string,
  errorObject?: any | undefined,
): Error {
  const { error, message } = errorObject;
  if (error) {
    return new Error(`${customMessage}: ${error}`);
  }

  if (message) {
    return new Error(`${customMessage}: ${message}`);
  }
  return new Error(customMessage);
}
