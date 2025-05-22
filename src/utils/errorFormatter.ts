export function errorFormatter(customMessage: string, { error }: any) {
  throw new Error(`${customMessage}: ${error}`);
}
