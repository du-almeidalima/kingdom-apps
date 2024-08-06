import { TestBed } from '@angular/core/testing';

import { InviteBO } from './invite-bo.service';

describe('InviteBo', () => {
  let service: InviteBO;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InviteBO);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
