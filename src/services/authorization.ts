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

  public generate(message: string, options?: Partial<GenerateOptions>): string {
    const { includeTime, seperator }: GenerateOptions = {
      includeTime: false,
      seperator: ':',
      ...options,
    };

    const messageBytes = naclUtil.decodeUTF8(message);

    const signature = nacl.sign.detached(
      messageBytes,
      this.wallet.payer.secretKey,
    );

    return `${message}${seperator}${base58.encode(signature)}${
      includeTime ? seperator + new Date().getTime() : ''
    }`;
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

  public generateHeader(
    message: string,
    options?: Partial<Omit<AuthorizationOptions, 'expiresInMinutes'>>,
  ): Headers {
    const { key, includeTime } = {
      key: 'Authorization',
      includeTime: false,
      ...options,
    };

    const headers = new Headers();
    const authorizationString = this.generate(message, { includeTime });

    headers.append(key, authorizationString);

    return headers;
  }

  public validateHeader(
    headers: IncomingHttpHeaders,
    options?: Partial<Omit<AuthorizationOptions, 'includeTime'>>,
  ): boolean {
    const { key, expiry } = { key: 'Authorization', expiry: 300, ...options };

    const validationHeader = headers[key];

    if (!validationHeader) {
      throw new Error(`Header not found with key ${key}.`);
    }

    if (typeof validationHeader !== 'string') {
      throw new Error('Header has invalid type.');
    }

    return this.validate(validationHeader, { expiry });
  }
}
