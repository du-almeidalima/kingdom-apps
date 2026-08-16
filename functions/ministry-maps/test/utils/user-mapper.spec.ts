import { toPublicUser } from '../../src/utils/user-mapper';
import type { UserDoc } from '../../src/models/user';
import type { DocumentReference } from 'firebase-admin/firestore';

describe('user-mapper', () => {
  describe('toPublicUser', () => {
    it('maps all fields from a complete UserDoc', () => {
      const mockUserDoc: UserDoc = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        photoUrl: 'https://example.com/photo.jpg',
        role: 'ADMIN',
        congregation: { id: 'cong-456' } as unknown as DocumentReference,
      };

      const result = toPublicUser(mockUserDoc);

      expect(result).toEqual({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        photoUrl: 'https://example.com/photo.jpg',
        role: 'ADMIN',
        congregationId: 'cong-456',
      });
    });

    it('supplies default empty strings and null for missing fields', () => {
      const partialUser = {
        id: 'user-minimal',
        role: 'PUBLISHER' as const,
      };

      const result = toPublicUser(partialUser);

      expect(result).toEqual({
        id: 'user-minimal',
        name: '',
        email: '',
        photoUrl: '',
        role: 'PUBLISHER',
        congregationId: null,
      });
    });

    it('handles null congregation reference safely', () => {
      const userWithoutCong: UserDoc = {
        id: 'user-no-cong',
        name: 'Jane',
        email: 'jane@example.com',
        photoUrl: '',
        role: 'ORGANIZER',
        congregation: undefined,
      };

      const result = toPublicUser(userWithoutCong);

      expect(result.congregationId).toBeNull();
    });
  });
});
