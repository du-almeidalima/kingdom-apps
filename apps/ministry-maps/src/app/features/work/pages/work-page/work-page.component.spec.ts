import { WorkPageComponent } from './work-page.component';
import { MockBuilder, MockInstance, MockRender, ngMocks } from 'ng-mocks';
import { ActivatedRoute } from '@angular/router';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';
import { DesignationRepository } from '../../../../repositories/designation.repository';
import { DesignationNotFoundComponent } from '../../components/designation-not-found/designation-not-found.component';

describe('WorkPageComponent', () => {
  // Resets customizations after each test, in our case of `ActivatedRoute`.
  MockInstance.scope();

  beforeEach(() => MockBuilder(WorkPageComponent).mock(ActivatedRoute).provide(MOCK_REPOSITORIES_PROVIDERS));

  it('should create', () => {
    MockInstance(ActivatedRoute, 'snapshot', jest.fn(), 'get').mockReturnValue({
      paramMap: new Map([['id', '12345']]),
    });

    const fixture = MockRender(WorkPageComponent, {
      territory: territoryMockBuilder({}),
    });

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('should show the not found screen when the designation no longer exists (e.g. deleted by the TTL policy)', fakeAsync(() => {
    MockInstance(ActivatedRoute, 'snapshot', jest.fn(), 'get').mockReturnValue({
      paramMap: new Map([['id', 'deleted-designation']]),
    });
    TestBed.overrideProvider(DesignationRepository, {
      useValue: { getById: () => of(undefined) },
    });

    const fixture = MockRender(WorkPageComponent);
    tick(200);
    fixture.detectChanges();

    const component = fixture.point.componentInstance as WorkPageComponent;
    expect(component.isNotFound).toBe(true);
    expect(ngMocks.find(fixture, 'kingdom-apps-designation-not-found')).toBeDefined();
  }));

  it('should not show the not found screen while the designation exists', () => {
    MockInstance(ActivatedRoute, 'snapshot', jest.fn(), 'get').mockReturnValue({
      paramMap: new Map([['id', '12345']]),
    });

    const fixture = MockRender(WorkPageComponent);

    const component = fixture.point.componentInstance as WorkPageComponent;
    expect(component.isNotFound).toBe(false);
    expect(ngMocks.findAll(fixture, DesignationNotFoundComponent)).toHaveLength(0);
  });
});
