import base58 from 'bs58';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { IncomingHttpHeaders } from 'http';
import { Wallet as AnchorWallet } from '@coral-xyz/anchor';

import { getWallet } from '../utils.js';
import { AuthorizationOptions, AuthorizationStore, GenerateOptions, ValidateOptions, Wallet } from '../types/index.js';


export class AuthorizationManager {
  private wallet: AnchorWallet;
  private store: AuthorizationStore | undefined;

  constructor(wallet: Wallet, store?: AuthorizationStore) {
    this.wallet = getWallet(wallet);
    this.store = store;
  }

  public async generate(
    message: string,
    options?: Partial<GenerateOptions>,
  ): Promise<string> {
    const { includeTime, seperator }: GenerateOptions = {
      includeTime: false,
      seperator: ':',
      ...options,
    };

    if (this.store) {
      const cached = this.store.get(this.wallet.publicKey.toString(), { includeTime, seperator });
      if (cached) {
        return cached;
      }
    }

    let signature: Uint8Array | undefined = undefined;

    if (typeof window !== "undefined") {
      const encodedMessage = new TextEncoder().encode(message);

      if ((window as any).phantom?.solana?.signMessage) {
        const response = await (window as any).phantom.solana.signMessage(
          encodedMessage,
          'utf8',
        );
        signature = response.signature;
      } else if (
        (this.wallet as any).adapter &&
        typeof (this.wallet as any).adapter.signMessage === 'function'
      ) {
        signature = await (this.wallet as any).adapter.signMessage(
          encodedMessage,
        );
      }
    } else if (this.wallet.payer.secretKey) {
      const messageBytes = naclUtil.decodeUTF8(message);
      signature = nacl.sign.detached(messageBytes, this.wallet.payer.secretKey);
    }

    if (!signature) {
      throw new Error('Wallet does not support message signing');
    }

    const value = `${message}${seperator}${base58.encode(signature)}${includeTime ? seperator + new Date().getTime() : ''}`;

    if (this.store) {
      this.store.set(this.wallet.publicKey.toString(), { includeTime, seperator }, value);
    }

    return value;
  }

  public validate(
    validationString: string,
    options?: Partial<ValidateOptions>,
  ): boolean {
    const { expiry, publicKey, seperator, expected_message }: ValidateOptions = {
      expiry: 300,
      publicKey: this.wallet.publicKey,
      seperator: ':',
      ...options,
    };

    const [message, signatureB64, date] = validationString.split(seperator);

    if (!message || !signatureB64) {
      throw new Error('Invalid signature.');
    }

    if (expected_message && message !== expected_message) {
      throw new Error("Failed to authenticate message.");
    }

    if (date) {
      if (
        (new Date().getTime() - new Date(parseInt(date)).getTime()) / 1000 >=
        expiry
      ) {
        throw new Error('Authorization has expired.');
      }
    }

    return nacl.sign.detached.verify(
      Buffer.from(message),
      base58.decode(signatureB64),
      publicKey.toBytes(),
    );
  }

  public async generateHeader(
    message: string,
    options?: Partial<Omit<AuthorizationOptions, 'expiresInMinutes'>>,
  ): Promise<Headers> {
    const { key, includeTime } = {
      key: 'Authorization',
      includeTime: false,
      ...options,
    };

    const headers = new Headers();
    const authorizationString = await this.generate(message, { includeTime });

    headers.append(key, authorizationString);

    return headers;
  }

  public validateHeader(
    headers: IncomingHttpHeaders,
    options?: Partial<Pick<AuthorizationOptions, 'key'>> &
      Partial<ValidateOptions>,
  ): boolean {
    const { key, expiry, seperator, publicKey, expected_message } = {
      key: 'authorization',
      expiry: 300,
      seperator: ':',
      publicKey: this.wallet.publicKey,
      ...options,
    };

    const validationHeader = headers[key];

    if (!validationHeader) {
      throw new Error(`Header not found with key ${key}.`);
    }

    if (typeof validationHeader !== 'string') {
      throw new Error('Header has invalid type.');
    }

    return this.validate(validationHeader, { expiry, seperator, publicKey, expected_message });
  }
}
