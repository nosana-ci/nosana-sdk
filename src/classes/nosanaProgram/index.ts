import { ConfirmOptions } from '@solana/web3.js';
import { Idl, MethodsNamespace, Program } from '@coral-xyz/anchor';

import { getPriorityFeePreInstruction } from './priorityFees/getPriorityFeePreInstruction.js';
import { SolanaConfig } from '../../client.js';

export class NosanaProgram<IDL extends Idl = Idl> extends Program<IDL> {
  // TODO: Some how correct the type to add the new optional args to methods RPC Fnc
  public methods!: MethodsNamespace<Idl>;

  constructor(config: SolanaConfig, ...args: ConstructorParameters<typeof Program<IDL>>) {
    super(...args);
    this.prioFeeProxyMethods(config);
  }

  private prioFeeProxyMethods(config: SolanaConfig) {
    this.methods = new Proxy(this.methods, {
      get(target, prop) {
        const value = target[prop as keyof typeof target];
        if (value instanceof Function) {
          return function (...args: unknown[]) {
            const method = value(...args);
            const methodProxy = new Proxy(method, {
              get(target, prop) {
                if (prop === 'rpc') {
                  return async function (
                    options?: ConfirmOptions & {
                      disablePrioFees?: boolean;
                    },
                  ) {
                    if (options?.disablePrioFees !== false) {
                      const preInstruction =
                        await getPriorityFeePreInstruction(config);
                      target['preInstructions'](preInstruction);
                    }
                    return await target[prop](options);
                  };
                }
                return target[prop as keyof typeof target];
              },
            });
            return methodProxy;
          };
        }
        return value;
      },
    });
  }
}
