export abstract class AutoDestructable {
  private __isDestroyed = false;

  constructor() {
    const proto = Object.getPrototypeOf(this);

    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (name) =>
        name !== 'constructor' && typeof (this as any)[name] === 'function',
    );

    for (const name of methodNames) {
      const originalMethod = (this as any)[name];

      (this as any)[name] = (...args: any[]) => {
        if (this.__isDestroyed) {
          throw new Error(`Cannot call '${name}': object is destroyed.`);
        }
        return originalMethod.apply(this, args);
      };
    }
  }

  delete(): void {
    this.__isDestroyed = true;
  }
}
