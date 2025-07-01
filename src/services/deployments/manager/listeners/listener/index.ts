import { Collection, Db, Document } from 'mongodb';

import { matchFilter } from './helpers/matchFilter';
import { CollectionsNames } from '../../definitions/collection';

import { Collections } from '../../types';
import { EventCallback, Filters, InsertEvent, UpdateEvent } from './types';

export type CollectionListener<T extends Document> = ReturnType<
  typeof createCollectionListener<T>
>;

export function createCollectionListener<T extends Document>(
  key: keyof Collections,
  db: Db,
) {
  if (!CollectionsNames.includes(key)) throw new Error('Invalid collection.');

  const collection: Collection<T> = db.collection(key);
  const insertCallbacks: Array<EventCallback<T>> = [];
  const updateCallbacks: Array<{
    filters?: Filters<T>;
    callback: EventCallback<T>;
  }> = [];

  const addListener = (...params: InsertEvent<T> | UpdateEvent<T>): void => {
    const [eventType, callback, filters] = params;
    switch (eventType) {
      case 'insert':
        insertCallbacks.push(callback);
        break;
      case 'update':
        updateCallbacks.push({
          filters: filters,
          callback: callback,
        });
    }
  };

  const start = async () => {
    const stream = collection.watch<T>([], {
      fullDocument: 'updateLookup',
    });

    for await (const event of stream) {
      switch (event.operationType) {
        case 'insert':
          insertCallbacks.forEach((callback) => callback(event.fullDocument));
          break;
        case 'update':
          updateCallbacks.forEach(({ filters, callback }) => {
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
  };

  return { addListener, start };
}
