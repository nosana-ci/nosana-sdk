import { Collection, Db, Document } from 'mongodb';

import { matchFilter } from './helpers/matchFilter';
import { CollectionsNames } from '../../definitions/collection';

import { Collections } from '../../types';
import { EventCallback, Filters, InsertEvent, UpdateEvent } from './types';

export class Listener<T extends Document> {
  private readonly collection: Collection<T>;

  private insertCallbacks: Array<EventCallback<T>>;
  private updateCallbacks: Array<{
    filters?: Filters<T>;
    callback: EventCallback<T>;
  }>;

  constructor(db: Db, collection: keyof Collections) {
    if (!CollectionsNames.includes(collection)) {
      throw new Error('Invalid collection.');
    }

    this.insertCallbacks = [] as typeof this.insertCallbacks;
    this.updateCallbacks = [] as typeof this.updateCallbacks;

    this.collection = db.collection(collection) as Collection<T>;
  }

  public addListener(...params: InsertEvent<T> | UpdateEvent<T>) {
    const [eventType, callback, filters] = params;
    switch (eventType) {
      case 'insert':
        this.insertCallbacks.push(callback);
        break;
      case 'update':
        this.updateCallbacks.push({
          filters: filters,
          callback: callback,
        });
    }
  }

  public async start() {
    const stream = this.collection.watch<T>([], {
      fullDocument: 'updateLookup',
    });

    for await (const event of stream) {
      switch (event.operationType) {
        case 'insert':
          this.insertCallbacks.forEach((callback) =>
            callback(event.fullDocument),
          );
          break;
        case 'update':
          this.updateCallbacks.forEach(({ filters, callback }) => {
            if (!event.updateDescription.updatedFields) return;

            if (filters) {
              if (
                !matchFilter(event.updateDescription.updatedFields, filters)
              ) {
                return;
              }
            }

            if (event.fullDocument) {
              callback(event.fullDocument);
            }
          });
      }
    }
  }
}
