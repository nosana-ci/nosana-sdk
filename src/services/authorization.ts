import base58 from 'bs58';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { IncomingHttpHeaders } from 'http';
import { PublicKey } from '@solana/web3.js';
import { Wallet as AnchorWallet } from '@coral-xyz/anchor';

import { getWallet } from '../utils.js';
import { Wallet } from '../types/index.js';

type AuthorizationOptions = {
  expiry: number;
  includeTime: boolean;
  key: string;
};

type ValidateOptions = {
  expiry: number;
  publicKey: PublicKey;
  seperator: string;
};

type GenerateOptions = {
  includeTime: boolean;
  seperator: string;
};

export class AuthorizationManager {
  private wallet: AnchorWallet;

  constructor(wallet: Wallet) {
    this.wallet = getWallet(wallet);
  }

  public async generate(message: string, options?: Partial<GenerateOptions>): Promise<string> {
    const { includeTime, seperator }: GenerateOptions = {
      includeTime: false,
      seperator: ':',
      ...options,
    };

    console.log('AuthorizationManager.generate - Wallet detection:', {
      isWindow: typeof window !== 'undefined',
      hasAdapter: !!(this.wallet as any).adapter,
      hasSignMessage: typeof (this.wallet as any).adapter?.signMessage === 'function',
      hasPayerSecretKey: !!(this.wallet as any).payer?.secretKey,
      walletKeys: Object.keys(this.wallet),
      wallet: this.wallet,
      hasSignMessageDirect: typeof (this.wallet as any).signMessage === 'function'
    });

    if (typeof window !== 'undefined' && 
        (this.wallet as any).adapter && 
        typeof (this.wallet as any).adapter.signMessage === 'function') {
      console.log('Using browser wallet signMessage');
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await (this.wallet as any).adapter.signMessage(encodedMessage);
      const signature = base58.encode(signedMessage);
      
      return `${message}${seperator}${signature}${
        includeTime ? seperator + new Date().getTime() : ''
      }`;
    }

    if (typeof window !== 'undefined' && (window as any).phantom?.solana?.signMessage) {
      console.log('Using Phantom directly');
      const encodedMessage = new TextEncoder().encode(message);
      const response = await (window as any).phantom.solana.signMessage(encodedMessage, 'utf8');
      const signature = base58.encode(response.signature);
      
      return `${message}${seperator}${signature}${
        includeTime ? seperator + new Date().getTime() : ''
      }`;
    }

    if (this.wallet.payer?.secretKey) {
      console.log('Using secret key wallet');
      const messageBytes = naclUtil.decodeUTF8(message);
      const signature = nacl.sign.detached(
        messageBytes,
        this.wallet.payer.secretKey,
      );

      return `${message}${seperator}${base58.encode(signature)}${
        includeTime ? seperator + new Date().getTime() : ''
      }`;
    }

    console.log('No supported signing method found');
    throw new Error('Wallet does not support message signing');
  }

  public validate(
    validationString: string,
    options?: Partial<ValidateOptions>,
  ): boolean {
    const { expiry, publicKey, seperator }: ValidateOptions = {
      expiry: 300,
      publicKey: this.wallet.publicKey,
      seperator: ':',
      ...options,
    };

    const [message, signatureB64, date] = validationString.split(seperator);

    if (!message || !signatureB64) {
      throw new Error('Invalid signature.');
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
    const { key, expiry, seperator, publicKey } = {
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

    return this.validate(validationHeader, { expiry, seperator, publicKey });
  }
}
