import type { QueryClient } from '../../client/index.js';

interface GenerateHeaderOptions {
  key: string;
}

export interface AuthorizationApi {
  generate: (message: string) => Promise<string>;
  generateHeader: (message: string, options?: GenerateHeaderOptions) => Promise<Headers>;
}

export function createAuthorization(client: QueryClient): AuthorizationApi {
  const generate = async (message: string): Promise<string> => {
    const { data, error } = await client.POST('/api/auth/sign-message/external', {
      body: { message }
    });
    if (!data || error) {
      throw new Error(`Failed to sign message`);
    }
    return `${data.message}:${data.signature}`;
  }

  const generateHeader = async (message: string, options: GenerateHeaderOptions = { key: "Authorization" }): Promise<Headers> => {
    const token = await generate(message);
    const headers = new Headers();
    headers.set(options.key, token);
    return headers
  }

  return {
    generate,
    generateHeader
  };
}