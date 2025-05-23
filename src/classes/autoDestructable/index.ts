export abstract class AutoDestructable {
  private __isFrozen = false;

  constructor() {
    const proto = Object.getPrototypeOf(this);

    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (name) =>
        name !== 'constructor' && typeof (this as any)[name] === 'function',
    );

    for (const name of methodNames) {
      const originalMethod = (this as any)[name];

      (this as any)[name] = (...args: any[]) => {
        if (this.__isFrozen) {
          throw new Error(`Cannot call '${name}': object is frozen.`);
        }
        return originalMethod.apply(this, args);
      };
    }
  }

  freeze(): void {
    this.__isFrozen = true;
  }
}
