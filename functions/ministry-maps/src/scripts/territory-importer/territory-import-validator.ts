import { VisitOutcomeEnum } from '../../models/designations-progress';
import {
  RawTerritoryImportRow,
  TERRITORY_ICON_CODES,
  TerritoryIconCode,
  ValidatedTerritoryImportRow,
  VISIT_OUTCOME_MAP,
  VisitOutcomeKey,
} from './territory-import.model';

export type TerritoryImportValidationError = {
  lineNumber: number;
  field: string;
  message: string;
};

export type TerritoryImportValidationResult = {
  validRows: ValidatedTerritoryImportRow[];
  errors: TerritoryImportValidationError[];
};

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const POSITIVE_INT_REGEX = /^[1-9]\d*$/;
const NON_NEGATIVE_INT_REGEX = /^\d+$/;
const HTTP_URL_REGEX = /^https?:\/\/\S+$/i;

/** Noon UTC keeps the calendar date intact across Western Hemisphere timezones (e.g. America/Sao_Paulo). */
const parseIsoDateAtUtcNoon = (value: string): Date | null => {
  const match = ISO_DATE_REGEX.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const parseOptionalBoolean = (
  value: string,
  defaultValue: boolean,
): { ok: true; value: boolean } | { ok: false } => {
  if (!value) return { ok: true, value: defaultValue };
  const lower = value.toLowerCase();
  if (lower === 'true') return { ok: true, value: true };
  if (lower === 'false') return { ok: true, value: false };
  return { ok: false };
};

export const validateTerritoryImportRows = (
  rows: RawTerritoryImportRow[],
  allowedCities: readonly string[],
  now: Date = new Date(),
): TerritoryImportValidationResult => {
  const allowedCitySet = new Set(allowedCities);
  const seenAddressAndMapsLinks = new Map<string, number>();
  const seenCityPositions = new Map<string, number>();

  const validRows: ValidatedTerritoryImportRow[] = [];
  const errors: TerritoryImportValidationError[] = [];

  for (const row of rows) {
    const rowErrors: TerritoryImportValidationError[] = [];
    const addError = (field: string, message: string) => {
      rowErrors.push({ lineNumber: row.lineNumber, field, message });
    };

    if (!row.city) {
      addError('city', 'city is required.');
    } else if (!allowedCitySet.has(row.city)) {
      addError(
        'city',
        `city "${row.city}" does not exist in congregation cities [${allowedCities.join(', ')}].`,
      );
    }

    const trimmedAddress = row.address.trim();
    const trimmedMapsLink = row.mapsLink.trim();

    if (!trimmedAddress) {
      addError('address', 'address is required.');
    }

    let mapsLink: string | undefined;
    if (trimmedMapsLink) {
      if (!HTTP_URL_REGEX.test(trimmedMapsLink)) {
        addError('mapsLink', `mapsLink "${trimmedMapsLink}" must be a valid http(s) URL.`);
      } else {
        mapsLink = trimmedMapsLink;
        if (trimmedAddress) {
          const normalizedAddress = trimmedAddress.replace(/\s+/g, ' ').toLowerCase();
          const duplicateKey = `${normalizedAddress}::${trimmedMapsLink}`;
          const firstSeenLine = seenAddressAndMapsLinks.get(duplicateKey);
          if (firstSeenLine !== undefined) {
            addError(
              'mapsLink',
              `Duplicate territory with address "${trimmedAddress}" and mapsLink "${trimmedMapsLink}" (already used on line ${firstSeenLine}).`,
            );
          } else {
            seenAddressAndMapsLinks.set(duplicateKey, row.lineNumber);
          }
        }
      }
    }

    let icon: TerritoryIconCode = 'o';
    if (row.icon) {
      if (!TERRITORY_ICON_CODES.includes(row.icon as TerritoryIconCode)) {
        addError(
          'icon',
          `Invalid icon "${row.icon}". Allowed values: ${TERRITORY_ICON_CODES.join(', ')}.`,
        );
      } else {
        icon = row.icon as TerritoryIconCode;
      }
    }

    let peopleQuantity = 1;
    if (row.peopleQuantity) {
      if (!POSITIVE_INT_REGEX.test(row.peopleQuantity)) {
        addError('peopleQuantity', `peopleQuantity "${row.peopleQuantity}" must be a positive integer.`);
      } else {
        peopleQuantity = Number(row.peopleQuantity);
      }
    }

    let positionIndex: number | undefined;
    if (row.positionIndex) {
      if (!NON_NEGATIVE_INT_REGEX.test(row.positionIndex)) {
        addError(
          'positionIndex',
          `positionIndex "${row.positionIndex}" must be a non-negative integer.`,
        );
      } else {
        positionIndex = Number(row.positionIndex);
        if (row.city) {
          const cityPosKey = `${row.city}::${positionIndex}`;
          const firstSeenLine = seenCityPositions.get(cityPosKey);
          if (firstSeenLine !== undefined) {
            addError(
              'positionIndex',
              `Duplicate positionIndex ${positionIndex} in city "${row.city}" (already used on line ${firstSeenLine}).`,
            );
          } else {
            seenCityPositions.set(cityPosKey, row.lineNumber);
          }
        }
      }
    }

    const bibleStudentParsed = parseOptionalBoolean(row.isBibleStudent, false);
    if (!bibleStudentParsed.ok) {
      addError('isBibleStudent', `isBibleStudent "${row.isBibleStudent}" must be "true" or "false".`);
    }

    const isRevisitParsed = parseOptionalBoolean(row.isRevisit, false);
    if (!isRevisitParsed.ok) {
      addError('isRevisit', `isRevisit "${row.isRevisit}" must be "true" or "false".`);
    }

    let lastVisit: Date | undefined;
    if (row.lastVisit) {
      const parsedDate = parseIsoDateAtUtcNoon(row.lastVisit);
      if (!parsedDate) {
        addError('lastVisit', `lastVisit "${row.lastVisit}" must be a valid YYYY-MM-DD date.`);
      } else {
        lastVisit = parsedDate;
      }
    }

    let visitOutcome: VisitOutcomeEnum | undefined;
    if (row.visitOutcome) {
      if (!(row.visitOutcome in VISIT_OUTCOME_MAP)) {
        addError(
          'visitOutcome',
          `Invalid visitOutcome "${row.visitOutcome}". Allowed values: ${Object.keys(VISIT_OUTCOME_MAP).join(', ')}.`,
        );
      } else {
        visitOutcome = VISIT_OUTCOME_MAP[row.visitOutcome as VisitOutcomeKey];
      }
    }

    const isRevisit = isRevisitParsed.ok ? isRevisitParsed.value : false;
    const hasHistoryFields =
      Boolean(row.visitOutcome) || isRevisit || Boolean(row.visitPublisher);

    if (hasHistoryFields && !row.lastVisit) {
      lastVisit = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0),
      );
    }

    if (lastVisit && visitOutcome === undefined && !row.visitOutcome) {
      visitOutcome = isRevisit ? VisitOutcomeEnum.REVISIT : VisitOutcomeEnum.SPOKE;
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    validRows.push({
      lineNumber: row.lineNumber,
      city: row.city.trim(),
      address: trimmedAddress,
      note: row.note.trim(),
      ...(row.mapGroup.trim() ? { mapGroup: row.mapGroup.trim() } : {}),
      ...(mapsLink ? { mapsLink } : {}),
      icon,
      peopleQuantity,
      ...(positionIndex !== undefined ? { positionIndex } : {}),
      isBibleStudent: bibleStudentParsed.ok ? bibleStudentParsed.value : false,
      ...(row.bibleInstructor.trim() ? { bibleInstructor: row.bibleInstructor.trim() } : {}),
      ...(lastVisit ? { lastVisit } : {}),
      ...(visitOutcome !== undefined ? { visitOutcome } : {}),
      isRevisit,
      ...(row.visitPublisher.trim() ? { visitPublisher: row.visitPublisher.trim() } : {}),
    });
  }

  return { validRows, errors };
};
