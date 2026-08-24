import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ResolvedTheme, ThemePreference, ThemeService } from '@kingdom-apps/common-ui';
import { AppearanceSettingsComponent } from './appearance-settings.component';

describe('AppearanceSettingsComponent', () => {
  let fixture: ComponentFixture<AppearanceSettingsComponent>;
  let preferenceSignal: ReturnType<typeof signal<ThemePreference>>;
  let resolvedThemeSignal: ReturnType<typeof signal<ResolvedTheme>>;
  let setPreferenceMock: jest.Mock;

  beforeEach(async () => {
    preferenceSignal = signal<ThemePreference>('system');
    resolvedThemeSignal = signal<ResolvedTheme>('light');
    setPreferenceMock = jest.fn((pref: ThemePreference) => {
      preferenceSignal.set(pref);
    });

    const mockThemeService = {
      preference: preferenceSignal.asReadonly(),
      resolvedTheme: resolvedThemeSignal.asReadonly(),
      setPreference: setPreferenceMock,
    };

    await TestBed.configureTestingModule({
      imports: [AppearanceSettingsComponent],
      providers: [{ provide: ThemeService, useValue: mockThemeService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AppearanceSettingsComponent);
    fixture.detectChanges();
  });

  // TS-U26
  it('should render 3 theme options (system, light, dark)', () => {
    const options = fixture.debugElement.queryAll(By.css('.lib-radio-option'));
    expect(options).toHaveLength(3);

    const systemOption = fixture.debugElement.query(By.css('[data-testid="theme-option-system"]'));
    const lightOption = fixture.debugElement.query(By.css('[data-testid="theme-option-light"]'));
    const darkOption = fixture.debugElement.query(By.css('[data-testid="theme-option-dark"]'));

    expect(systemOption).toBeTruthy();
    expect(lightOption).toBeTruthy();
    expect(darkOption).toBeTruthy();
  });

  // TS-U27
  it('should reflect initial active selection from ThemeService.preference', () => {
    const systemOption = fixture.debugElement.query(By.css('[data-testid="theme-option-system"]'));
    const systemRadio = systemOption.query(By.css('input[type="radio"]')).nativeElement as HTMLInputElement;

    expect(systemOption.nativeElement.classList.contains('lib-radio-option--selected')).toBe(true);
    expect(systemRadio.checked).toBe(true);
  });

  // TS-U28
  it('should call ThemeService.setPreference when selecting a new option', () => {
    const darkOption = fixture.debugElement.query(By.css('[data-testid="theme-option-dark"]'));

    darkOption.nativeElement.click();
    fixture.detectChanges();

    expect(setPreferenceMock).toHaveBeenCalledWith('dark');
  });

  // TS-U29
  it('should update selection state when ThemeService.preference signal changes', () => {
    preferenceSignal.set('light');
    fixture.detectChanges();

    const lightOption = fixture.debugElement.query(By.css('[data-testid="theme-option-light"]'));
    const systemOption = fixture.debugElement.query(By.css('[data-testid="theme-option-system"]'));

    expect(lightOption.nativeElement.classList.contains('lib-radio-option--selected')).toBe(true);
    expect(systemOption.nativeElement.classList.contains('lib-radio-option--selected')).toBe(false);
  });

  // TS-U30
  it('should have proper accessibility attributes and radiogroup structure', () => {
    const radiogroup = fixture.debugElement.query(By.css('[role="radiogroup"]'));
    expect(radiogroup).toBeTruthy();
    expect(radiogroup.attributes['aria-label']).toBe('Preferência de tema');

    const inputs = fixture.debugElement.queryAll(By.css('input[type="radio"]'));
    expect(inputs).toHaveLength(3);
    inputs.forEach((input) => {
      expect(input.attributes['name']).toBe('appearance-theme-preference');
    });
  });
});
