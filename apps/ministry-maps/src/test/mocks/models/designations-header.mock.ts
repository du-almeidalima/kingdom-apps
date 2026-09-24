import { EMPTY, Observable } from 'rxjs';
import { DesignationsHeaderRepository } from '../../../app/repositories/designations-header.repository';
import { DesignationsHeader } from '../../../models/designations-header';
import { DesignationsHeaderClosedByEnum } from '../../../models/enums/designations-header-closed-by';
import { DesignationsHeaderStatusEnum } from '../../../models/enums/designations-header-status';

// MOCK CLASSES
export class DesignationsHeaderRepositoryMock implements DesignationsHeaderRepository {
  getInProgressByCongregation(_congregationId: string): Observable<DesignationsHeader | undefined> {
    return EMPTY;
  }

  getInProgressStreamByCongregation(_congregationId: string): Observable<DesignationsHeader | undefined> {
    return EMPTY;
  }

  add(_header: Omit<DesignationsHeader, 'id'>): Observable<DesignationsHeader> {
    return EMPTY;
  }

  close(_id: string, _closedBy?: DesignationsHeaderClosedByEnum): Observable<void> {
    return EMPTY;
  }
}

const mockDesignationsHeader: DesignationsHeader = {
  id: 'DESIGNATIONS-HEADER-1',
  congregationId: 'CONGREGATION-1',
  status: DesignationsHeaderStatusEnum.IN_PROGRESS,
  createdAt: new Date(2026, 8, 1, 12, 0, 0),
  createdBy: 'USER-1',
};

export const designationsHeaderMockBuilder = (header: Partial<DesignationsHeader>): DesignationsHeader => {
  return {
    ...mockDesignationsHeader,
    ...header,
  };
};
