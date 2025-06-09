export abstract class AutoDestructurable {
  private __isFrozen = false;

  constructor(error_message: string | ((functionName: string) => string)) {
    const proto = Object.getPrototypeOf(this);

    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (name) =>
        name !== 'constructor' && typeof (this as any)[name] === 'function',
    );

    for (const name of methodNames) {
      const originalMethod = (this as any)[name];

      (this as any)[name] = (...args: any[]) => {
        if (this.__isFrozen) {
          if (typeof error_message === 'string') {
            throw new Error(error_message);
          }
          throw new Error(error_message(name));
        }
        return originalMethod.apply(this, args);
      };
    }
  }

  freeze(): void {
    this.__isFrozen = true;
  }
}
