import { ConfirmOptions } from '@solana/web3.js';
import { Idl, MethodsNamespace, Program } from '@coral-xyz/anchor';

import { getPriorityFeePreInstruction } from './priorityFees/getPriorityFeePreInstruction.js';

export class NosanaProgram<IDL extends Idl = Idl> extends Program<IDL> {
  // TODO: Some how correct the type to add the new optional args to methods RPC Fnc
  public methods!: MethodsNamespace<Idl>;

  constructor(...args: ConstructorParameters<typeof Program<IDL>>) {
    super(...args);
    this.prioFeeProxyMethods();
  }

  private prioFeeProxyMethods() {
    this.methods = new Proxy(this.methods, {
      get(target, prop) {
        return function (...args: unknown[]) {
          const method = target[prop as keyof typeof target](...args);
          const methodProxy = new Proxy(method, {
            get(target, prop) {
              if (prop === 'rpc') {
                return async function (options?: ConfirmOptions) {
                  const preInstruction = await getPriorityFeePreInstruction();
                  target['preInstructions'](preInstruction);
                  return await target[prop](options);
                };
              }
              return target[prop as keyof typeof target];
            },
          });
          return methodProxy;
        };
      },
    });
  }
}
