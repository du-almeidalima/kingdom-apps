import { DocumentReference } from 'firebase/firestore';
import { firebaseEntityConverterFactory, removeUndefined } from './firebase-entity-converter';

describe('removeUndefined', () => {
  it('removes undefined properties at the top level', () => {
    const obj = { a: 1, b: undefined, c: 'kept' };

    removeUndefined(obj);

    expect(obj).toEqual({ a: 1, c: 'kept' });
  });

  it('removes undefined properties in nested objects', () => {
    const obj = { nested: { a: 1, b: undefined }, c: 'kept' };

    removeUndefined(obj);

    expect(obj).toEqual({ nested: { a: 1 }, c: 'kept' });
  });

  it('keeps null values (Firestore-legal)', () => {
    const obj = { a: null, b: 1 };

    removeUndefined(obj);

    expect(obj).toEqual({ a: null, b: 1 });
  });

  it('does not recurse into DocumentReference values', () => {
    const docRef = Object.create(DocumentReference.prototype);
    const obj = { ref: docRef };

    expect(() => removeUndefined(obj)).not.toThrow();
    expect(obj.ref).toBe(docRef);
  });

  it('deletes undefined array entries, leaving a sparse array', () => {
    const obj = { list: [1, undefined, 3] };

    removeUndefined(obj);

    expect(obj.list).toHaveLength(3);
    expect(0 in obj.list).toBe(true);
    expect(1 in obj.list).toBe(false);
    expect(2 in obj.list).toBe(true);
  });

  it('warns to the console when a property is removed', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const obj = { b: undefined };

    try {
      removeUndefined(obj);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("'b' is undefined"));
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('firebaseEntityConverterFactory', () => {
  const makeSnapshot = (id: string, data: unknown) =>
    ({
      id,
      data: () => data,
    }) as Parameters<ReturnType<typeof firebaseEntityConverterFactory>['fromFirestore']>[0];

  describe('fromFirestore', () => {
    it('injects the snapshot id into the model', () => {
      const converter = firebaseEntityConverterFactory<{ id: string; name: string }>();

      const result = converter.fromFirestore(makeSnapshot('TERRITORY-1', { name: 'John' }));

      expect(result).toEqual({ id: 'TERRITORY-1', name: 'John' });
    });

    it('overlays the custom converter output last, on top of the injected id', () => {
      const converter = firebaseEntityConverterFactory<{ id: string; lastVisit?: Date }>((data) => ({
        lastVisit: (data as { lastVisit: string }).lastVisit
          ? new Date((data as { lastVisit: string }).lastVisit)
          : undefined,
      }));

      const result = converter.fromFirestore(makeSnapshot('TERRITORY-1', { lastVisit: '2024-05-01T10:00:00.000Z' }));

      expect(result.id).toBe('TERRITORY-1');
      expect(result.lastVisit).toEqual(new Date('2024-05-01T10:00:00.000Z'));
    });
  });

  describe('toFirestore', () => {
    it('strips undefined properties and returns the same object reference', () => {
      const converter = firebaseEntityConverterFactory<{ a: number; b?: string }>();
      const model = { a: 1, b: undefined };

      const result = converter.toFirestore(model);

      expect(result).toBe(model as never);
      expect(result).toEqual({ a: 1 });
    });
  });
});
