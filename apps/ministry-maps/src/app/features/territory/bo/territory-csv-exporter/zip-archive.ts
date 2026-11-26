/**
 * Minimal, zero-dependency PKZIP archive builder using the `STORE` (method 0, uncompressed) format.
 *
 * Used to package Office Open XML (`.xlsx`) parts in the browser without pulling in a full ZIP library.
 * Standard ZIP32 headers with explicit sizes and CRC-32 values in both the Local File Header and the
 * Central Directory are used so that Excel, Google Sheets (mobile & web), OnlyOffice, LibreOffice,
 * and Apple Numbers all accept the archive without repair prompts.
 */

export interface ZipEntry {
  /** Archive-relative POSIX path (e.g. `'xl/workbook.xml'`). */
  path: string;
  /** Raw file content bytes. */
  data: Uint8Array;
}

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIR_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50;

const ZIP_VERSION_20 = 20;
const UTF8_FILENAME_FLAG = 0x0800;
const STORE_COMPRESSION_METHOD = 0;

/** Fixed DOS timestamp (1980-01-01 00:00:00) so builds are deterministic in tests. */
const DOS_DEFAULT_TIME = 0x0000;
const DOS_DEFAULT_DATE = 0x0021;

const LOCAL_HEADER_FIXED_SIZE = 30;
const CENTRAL_HEADER_FIXED_SIZE = 46;
const END_OF_CENTRAL_DIR_SIZE = 22;

const textEncoder = new TextEncoder();

/** Precomputed IEEE 802.3 CRC-32 lookup table (polynomial 0xEDB88320). */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }

  return table;
})();

/** Computes the unsigned 32-bit CRC-32 checksum of a byte buffer. */
export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Packs a list of in-memory files into a valid ZIP32 archive (`Uint8Array`).
 */
export function createZipArchive(entries: readonly ZipEntry[]): Uint8Array<ArrayBuffer> {
  const prepared = entries.map((entry) => {
    const pathBytes = textEncoder.encode(entry.path);
    const crc32 = computeCrc32(entry.data);

    return {
      pathBytes,
      data: entry.data,
      crc32,
      localHeaderSize: LOCAL_HEADER_FIXED_SIZE + pathBytes.length,
      centralHeaderSize: CENTRAL_HEADER_FIXED_SIZE + pathBytes.length,
    };
  });

  const localSectionSize = prepared.reduce((sum, e) => sum + e.localHeaderSize + e.data.length, 0);
  const centralDirSize = prepared.reduce((sum, e) => sum + e.centralHeaderSize, 0);
  const totalSize = localSectionSize + centralDirSize + END_OF_CENTRAL_DIR_SIZE;

  const buffer = new ArrayBuffer(totalSize);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  let localOffset = 0;
  let centralOffset = localSectionSize;

  for (const entry of prepared) {
    const fileSize = entry.data.length;
    const pathLength = entry.pathBytes.length;
    const entryOffset = localOffset;

    // 1. Local File Header (30 bytes + filename)
    view.setUint32(localOffset, LOCAL_FILE_HEADER_SIGNATURE, true);
    view.setUint16(localOffset + 4, ZIP_VERSION_20, true);
    view.setUint16(localOffset + 6, UTF8_FILENAME_FLAG, true);
    view.setUint16(localOffset + 8, STORE_COMPRESSION_METHOD, true);
    view.setUint16(localOffset + 10, DOS_DEFAULT_TIME, true);
    view.setUint16(localOffset + 12, DOS_DEFAULT_DATE, true);
    view.setUint32(localOffset + 14, entry.crc32, true);
    view.setUint32(localOffset + 18, fileSize, true);
    view.setUint32(localOffset + 22, fileSize, true);
    view.setUint16(localOffset + 26, pathLength, true);
    view.setUint16(localOffset + 28, 0, true); // extra field length
    bytes.set(entry.pathBytes, localOffset + LOCAL_HEADER_FIXED_SIZE);
    localOffset += entry.localHeaderSize;

    // 2. Uncompressed File Data
    bytes.set(entry.data, localOffset);
    localOffset += fileSize;

    // 3. Central Directory File Header (46 bytes + filename)
    view.setUint32(centralOffset, CENTRAL_DIR_HEADER_SIGNATURE, true);
    view.setUint16(centralOffset + 4, ZIP_VERSION_20, true); // version made by
    view.setUint16(centralOffset + 6, ZIP_VERSION_20, true); // version needed to extract
    view.setUint16(centralOffset + 8, UTF8_FILENAME_FLAG, true);
    view.setUint16(centralOffset + 10, STORE_COMPRESSION_METHOD, true);
    view.setUint16(centralOffset + 12, DOS_DEFAULT_TIME, true);
    view.setUint16(centralOffset + 14, DOS_DEFAULT_DATE, true);
    view.setUint32(centralOffset + 16, entry.crc32, true);
    view.setUint32(centralOffset + 20, fileSize, true);
    view.setUint32(centralOffset + 24, fileSize, true);
    view.setUint16(centralOffset + 28, pathLength, true);
    view.setUint16(centralOffset + 30, 0, true); // extra field length
    view.setUint16(centralOffset + 32, 0, true); // file comment length
    view.setUint16(centralOffset + 34, 0, true); // disk number start
    view.setUint16(centralOffset + 36, 0, true); // internal file attributes
    view.setUint32(centralOffset + 38, 0, true); // external file attributes
    view.setUint32(centralOffset + 42, entryOffset, true);
    bytes.set(entry.pathBytes, centralOffset + CENTRAL_HEADER_FIXED_SIZE);
    centralOffset += entry.centralHeaderSize;
  }

  // 4. End of Central Directory Record (22 bytes)
  view.setUint32(centralOffset, END_OF_CENTRAL_DIR_SIGNATURE, true);
  view.setUint16(centralOffset + 4, 0, true); // number of this disk
  view.setUint16(centralOffset + 6, 0, true); // disk where central directory starts
  view.setUint16(centralOffset + 8, prepared.length, true);
  view.setUint16(centralOffset + 10, prepared.length, true);
  view.setUint32(centralOffset + 12, centralDirSize, true);
  view.setUint32(centralOffset + 16, localSectionSize, true);
  view.setUint16(centralOffset + 20, 0, true); // archive comment length

  return bytes;
}

/**
 * Extracts all stored (method 0) entries from a ZIP32 archive into a `path -> Uint8Array` map.
 * Used by unit and E2E tests to inspect generated `.xlsx` packages without external dependencies.
 */
export function readStoredZipArchive(archive: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const textDecoder = new TextDecoder('utf-8');
  const files = new Map<string, Uint8Array>();

  let offset = 0;
  while (offset + 4 <= archive.byteLength) {
    const signature = view.getUint32(offset, true);
    if (signature !== LOCAL_FILE_HEADER_SIGNATURE) {
      break;
    }

    const method = view.getUint16(offset + 8, true);
    if (method !== STORE_COMPRESSION_METHOD) {
      throw new Error(`Unsupported ZIP compression method: ${method}`);
    }

    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraFieldLength = view.getUint16(offset + 28, true);

    const nameStart = offset + LOCAL_HEADER_FIXED_SIZE;
    const dataStart = nameStart + fileNameLength + extraFieldLength;
    const path = textDecoder.decode(archive.subarray(nameStart, nameStart + fileNameLength));

    files.set(path, archive.subarray(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }

  return files;
}
