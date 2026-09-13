import { describe, expect, it } from 'vitest';
import { createInMemoryCollection } from '../../../src/repositories/memory/inMemoryCollection.js';
import { ConflictError } from '../../../src/lib/errors.js';

const entity = (id = 'a') => ({ id, name: 'Ada', skills: ['JavaScript'] });

describe('createInMemoryCollection', () => {
  it('stores and retrieves an entity', async () => {
    const collection = createInMemoryCollection('Candidate');
    await collection.create(entity());

    expect(await collection.findById('a')).toMatchObject({ id: 'a', name: 'Ada' });
    expect(await collection.count()).toBe(1);
  });

  it('returns null for an unknown id', async () => {
    const collection = createInMemoryCollection('Candidate');

    expect(await collection.findById('missing')).toBeNull();
  });

  it('rejects a duplicate id with a conflict', async () => {
    const collection = createInMemoryCollection('Candidate');
    await collection.create(entity());

    await expect(collection.create(entity())).rejects.toBeInstanceOf(ConflictError);
  });

  it('isolates stored state from caller mutation', async () => {
    const collection = createInMemoryCollection('Candidate');
    const input = entity();
    await collection.create(input);

    input.name = 'mutated after insert';
    const read = await collection.findById('a');
    read.skills.push('mutated after read');

    expect((await collection.findById('a')).name).toBe('Ada');
    expect((await collection.findById('a')).skills).toEqual(['JavaScript']);
  });

  it('lists everything and clears', async () => {
    const collection = createInMemoryCollection('Candidate');
    await collection.create(entity('a'));
    await collection.create(entity('b'));

    expect(await collection.findAll()).toHaveLength(2);

    await collection.clear();
    expect(await collection.findAll()).toEqual([]);
  });
});
