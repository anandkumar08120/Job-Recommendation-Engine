import { ConflictError } from '../../lib/errors.js';

const clone = (value) => structuredClone(value);

export const createInMemoryCollection = (resourceName) => {
  const items = new Map();

  return {
    async create(entity) {
      if (items.has(entity.id)) {
        throw new ConflictError(`${resourceName} with id "${entity.id}" already exists`, {
          resource: resourceName,
          id: entity.id,
        });
      }
      items.set(entity.id, clone(entity));
      return clone(entity);
    },

    async findById(id) {
      const found = items.get(id);
      return found ? clone(found) : null;
    },

    async findAll() {
      return [...items.values()].map(clone);
    },

    async count() {
      return items.size;
    },

    async clear() {
      items.clear();
    },
  };
};
