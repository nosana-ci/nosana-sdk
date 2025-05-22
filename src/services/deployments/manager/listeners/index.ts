import { Db } from 'mongodb';

import { Collections } from '../types';
import { CollectionsNames } from '../definitions/collection';

export class DeploymentManagerListeners {
  private collections: Collections;

  constructor(db: Db) {
    // @ts-ignore
    let collections: Collections = {};
    for (const collection of CollectionsNames) {
      // @ts-ignore
      collections[collection] = db.collection(collection);
    }
    this.collections = collections;
  }

  async start() {
    const deploymentsStreams = this.collections.deployments.watch();

    for await (const stream of deploymentsStreams) {
      console.log(stream);
    }

    await deploymentsStreams.close();
  }
}
