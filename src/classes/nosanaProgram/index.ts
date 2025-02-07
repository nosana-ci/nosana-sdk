import { ConfirmOptions } from '@solana/web3.js';
import { Idl, MethodsNamespace, Program } from '@coral-xyz/anchor';

import { getPriorityFeePreInstruction } from './priorityFees/getPriorityFeePreInstruction';

export class NosanaProgram<IDL extends Idl = Idl> extends Program<IDL> {
  // TODO: Some how correct the type to add the new optional args to methods RPC Fnc
  public methods!: MethodsNamespace<Idl>;

  constructor(...args: ConstructorParameters<typeof Program<IDL>>) {
    super(...args);
    this.prioFeeProxyMethods();
  }

  private prioFeeProxyMethods() {
    const proxy = new Proxy(this.methods, {
      get: (target, prop) => {
        return (...args: unknown[]) => {
          // @ts-ignore
          const method = target[prop](...args);
          const rpc = method.rpc;

          method.rpc = async (
            options?: ConfirmOptions & { disablePriorityFees?: boolean },
          ) => {
            if (options?.disablePriorityFees !== true) {
              const preInstruction = await getPriorityFeePreInstruction();
              method.preInstructions(preInstruction);
            }

            return await rpc(options);
          };

          return method;
        };
      },
    });

    this.methods = proxy;
  }
}
