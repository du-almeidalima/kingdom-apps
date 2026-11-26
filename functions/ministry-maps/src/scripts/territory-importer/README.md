# Territory Importer — AI TSV Preparation Guide & CLI Reference

This folder contains the ingestion pipeline that imports territories (and their latest visit status) for a congregation from a **14-column Tab-Separated Values (`.tsv`)** file into Firestore.

> **Instructions for the AI Assistant preparing the `.tsv` file:**
> Read every rule below carefully before generating the output file. The validator rejects the **entire file** if even one row violates a format, enum, duplicate, or pairing rule.

---

## 1. File Format Rules

1. **Delimiter:** Use a single **TAB character (`\t`)** between columns. Never use commas (`,`) or semicolons (`;`) as column delimiters, because Brazilian addresses and notes contain commas and semicolons.
2. **Encoding:** UTF-8 text (`.tsv`).
3. **Line 1 (Header Row):** Must contain the **exact 14 column names** listed below, separated by `\t` (case-sensitive):
   ```text
   city	address	note	mapGroup	mapsLink	icon	peopleQuantity	positionIndex	isBibleStudent	bibleInstructor	lastVisit	visitOutcome	isRevisit	visitPublisher
   ```
4. **Every data row must have at most 14 tab-separated cells** (up to 13 `\t` characters per line; trailing empty columns at the end of a line may keep or omit trailing tabs).
5. **Sanitize cell text:**
   - Remove any literal tab (`\t`) or newline (`\r`, `\n`) inside a cell value (replace them with a single space).
   - Do **not** wrap values in quotes (`"..."`) unless the literal quote is part of the text; standard TSV cells are unquoted.
   - Leave optional unknown fields completely empty between tabs (`\t\t`). Never write `null`, `N/A`, `-`, `none`, or `undefined`.

---

## 2. The 14 Columns (Specification)

| # | Column Name | Required? | Format / Allowed Values | Default if Empty | What to Put Here |
|---|-------------|-----------|-------------------------|------------------|------------------|
| 1 | `city` | **REQUIRED** | Exact string matching one of the congregation's configured `cities` in Firestore | *(error)* | City (or territory region) name, e.g. `São Paulo`. Must match accents and casing exactly. |
| 2 | `address` | **REQUIRED** | Non-empty text | *(error)* | Street name, number, apartment/house number, and neighborhood, e.g. `Rua das Flores, 123 - Apto 4, Centro`. |
| 3 | `note` | Optional | Text (no tabs/newlines) | `""` | Permanent territory notes: resident's name, gate/intercom details, reference points (e.g. `João - Portão verde ao lado da padaria`). **Do not put `mapGroup` here.** |
| 4 | `mapGroup` | Optional | Text | *(none)* | Original congregation map/card identifier (e.g. `Mapa 01`, `Cartão 12`, `Grupo A`). The importer automatically combines `mapGroup` and `note` as `${mapGroup}: ${note}` (or just `${mapGroup}` if `note` is empty). |
| 5 | `mapsLink` | Optional | Full URL starting with `http://` or `https://` | *(omitted)* | Google Maps link (e.g. `https://maps.app.goo.gl/...`). The combination of `(address, mapsLink)` must be unique across the file. |
| 6 | `icon` | Optional | **Code only:** `m`, `w`, `c`, `cp`, `o` | `o` | Resident profile icon code (see Section 3.1). Never write Portuguese words like `Homem`. |
| 7 | `peopleQuantity` | Optional | Positive integer (`1`, `2`, `3`, ...) | `1` | How many deaf/target people live at this address. Do not write `0`. |
| 8 | `positionIndex` | Optional | Non-negative integer (`0`, `1`, `2`, ...) | Auto `0, 1, 2...` per city | Sorting order within the city (0-based). Leave empty unless an explicit number order is required. Must not have duplicates within the same city. |
| 9 | `isBibleStudent` | Optional | `true` or `false` | `false` | Whether the resident currently studies the Bible. Never write `Sim` or `Não`. |
| 10 | `bibleInstructor` | Optional | Text | *(omitted)* | Name of the Bible study conductor if known (e.g. `Carlos Silva`). |
| 11 | `lastVisit` | Optional | `YYYY-MM-DD` (ISO date) | Today's date (if history fields exist) or `null` | Date of the last recorded visit. Leave empty if unknown (if `visitOutcome`, `isRevisit=true`, or `visitPublisher` is set without a date, the importer automatically uses today's date). |
| 12 | `visitOutcome` | Optional | `SPOKE`, `NOT_ANSWERED`, `MOVED`, `ASKED_TO_NOT_VISIT_AGAIN`, `REVISIT` | `REVISIT` (if `isRevisit=true`) or `SPOKE` (if `lastVisit` is set) | Outcome enum key of the last visit (see Section 3.2). |
| 13 | `isRevisit` | Optional | `true` or `false` | `false` | `true` if this territory has an active revisit badge. |
| 14 | `visitPublisher` | Optional | Text | *(omitted)* | Name of the publisher who made the last visit (`lastVisit`). |

---

## 3. Exact Lookup Tables for AI Translation

### 3.1 `icon` Column (Use ONLY the lowercase code)

| Source Spreadsheet Clue (Portuguese) | Output in `icon` Column | Meaning |
|--------------------------------------|-------------------------|---------|
| Homem, Masculino, Rapaz, Sr., H, M | `m` | Man (`TerritoryIcon.MAN`) |
| Mulher, Feminino, Moça, Sra., F | `w` | Woman (`TerritoryIcon.WOMAN`) |
| Criança, Menino, Menina, Bebê | `c` | Child (`TerritoryIcon.CHILD`) |
| Casal, Marido e Esposa | `cp` | Couple (`TerritoryIcon.COUPLE`) |
| Outro, Família, Não informado, *(blank)* | `o` | Other / Unknown (`TerritoryIcon.OTHER`) |

> **GOTCHA:** In Portuguese, "Mulher" starts with `M`, and "Homem" starts with `H`. **Never output `h` for Homem or `m` for Mulher!** Always use English codes: `m` = Man (Homem), `w` = Woman (Mulher).

### 3.2 `visitOutcome` Column (Use ONLY the uppercase English key)

| Source Spreadsheet Clue (Portuguese) | Output in `visitOutcome` Column | Also set `isRevisit`? |
|--------------------------------------|---------------------------------|-----------------------|
| Conversou, Atendeu, Falou com o morador, Visitado | `SPOKE` | `false` (or empty) |
| Não estava, Não atendeu, Ausente, Casa fechada | `NOT_ANSWERED` | `false` (or empty) |
| Mudou-se, Se mudou, Não mora mais lá | `MOVED` | `false` (or empty) |
| Pediu para não visitar, Não visitar | `ASKED_TO_NOT_VISIT_AGAIN` | `false` (or empty) |
| Revisita, Voltar a visitar, Interessado | `REVISIT` | `true` |

---

## 4. Critical Rules & Common AI Mistakes to Avoid

### Rule 1: Do NOT pre-concatenate `mapGroup` into `note`
- **Wrong:** `note = "Mapa 04: Portão azul"`, `mapGroup = "Mapa 04"` (results in `"Mapa 04: Mapa 04: Portão azul"`).
- **Right:** `note = "Portão azul"`, `mapGroup = "Mapa 04"`.
- If the territory only has a map group (`Mapa 04`) and no other note, leave `note` empty and set `mapGroup = "Mapa 04"` (the script will store `"Mapa 04"` in Firestore).

### Rule 2: `lastVisit` and History Columns Pairing
The last 4 columns (`lastVisit`, `visitOutcome`, `isRevisit`, `visitPublisher`) control the territory's `lastVisit` timestamp and its initial `history` entry:
- **Case A — Never visited / No visit info:** Leave all 4 columns (`lastVisit`, `visitOutcome`, `isRevisit`, `visitPublisher`) completely empty.
- **Case B — Has a visit date (`lastVisit`) and an outcome:** Fill `lastVisit` in `YYYY-MM-DD` format (convert Brazilian `25/03/2026` → `2026-03-25`). Fill `visitOutcome`, `isRevisit`, and optionally `visitPublisher`.
- **Case C — Has a visit date (`lastVisit`) but the spreadsheet doesn't mention the outcome:** Fill `lastVisit` (`YYYY-MM-DD`) and leave `visitOutcome` empty (the importer automatically defaults `visitOutcome` to `REVISIT` if `isRevisit=true`, or `SPOKE` otherwise).
- **Case D — Spreadsheet mentions an outcome (`Mudou-se`, `Revisita`, `Não visitar`) or a publisher, but has NO date:** Fill `visitOutcome` (and `isRevisit`/`visitPublisher` if applicable) and **leave `lastVisit` empty** — the importer code automatically assigns today's date to both `lastVisit` and the history entry.

### Rule 3: Convert Brazilian Dates (`DD/MM/YYYY`) to ISO (`YYYY-MM-DD`)
- `14/02/2026` → `2026-02-14`
- `5/9/25` → `2025-09-05`
- Invalid calendar dates like `2026-02-30` or `14/02/2026` will fail validation.

### Rule 4: Deduplicate `(address + mapsLink)`
- The validator rejects the file if two rows contain both the exact same `address` (case-insensitive) **and** the exact same non-empty `mapsLink`.
- Two different people living in different apartments/units of the **same building** may share the same `mapsLink` as long as their `address` values include the distinguishing unit/apartment (or if they live in the exact same residence, merge them into **one row** with `peopleQuantity` increased and both names in `note`).

### Rule 5: `positionIndex` is 0-based per city
- If the source spreadsheet numbers items `1, 2, 3...`, either:
  - Leave `positionIndex` **empty** on every row (recommended — the importer automatically numbers them `0, 1, 2...` per city in the order they appear in the TSV), **OR**
  - Convert them to 0-based integers (`0, 1, 2...`) with no duplicate index inside the same city.

---

## 5. Worked Example (Raw Input → Valid TSV)

### Target Congregation Cities in Firestore
`["Campinas", "Valinhos"]`

### Raw Congregation Input
1. **Mapa 01** - Campinas - Rua Barão de Jaguara, 500, Centro. Moradora: Maria (Mulher). Estuda a Bíblia com Ana Paula. Última visita em 10/03/2026 por Ana Paula (Conversou). Link: `https://maps.app.goo.gl/abc111`
2. **Mapa 01** - Campinas - Av. Francisco Glicério, 1020, Apto 32 (Homem, 1 pessoa). Mudou-se em 15/01/2026 (relatado por Marcos). Link: `https://maps.app.goo.gl/abc222`
3. **Mapa 02** - Valinhos - Rua Itália, 88, Jardim Ribeiro. Casal (2 pessoas), portão branco. Revisita feita em 20/02/2026 por Pedro. Sem link do Maps.
4. **Mapa 03** - Valinhos - Rua Doze de Outubro, 45. Sem detalhes adicionais, nunca visitado. Link: `https://maps.app.goo.gl/abc444`

### Resulting TSV Content
*(Below, `\t` is actual tab separation)*

```tsv
city	address	note	mapGroup	mapsLink	icon	peopleQuantity	positionIndex	isBibleStudent	bibleInstructor	lastVisit	visitOutcome	isRevisit	visitPublisher
Campinas	Rua Barão de Jaguara, 500, Centro	Maria	Mapa 01	https://maps.app.goo.gl/abc111	w	1		true	Ana Paula	2026-03-10	SPOKE	false	Ana Paula
Campinas	Av. Francisco Glicério, 1020, Apto 32		Mapa 01	https://maps.app.goo.gl/abc222	m	1		false		2026-01-15	MOVED	false	Marcos
Valinhos	Rua Itália, 88, Jardim Ribeiro	Portão branco	Mapa 02		cp	2		false		2026-02-20	REVISIT	true	Pedro
Valinhos	Rua Doze de Outubro, 45		Mapa 03	https://maps.app.goo.gl/abc444	o	1		false
```

What the importer writes to Firestore for those 4 rows:
- Row 1 (`Campinas`): `positionIndex: 0`, `note: "Mapa 01: Maria"`, `isBibleStudent: true`, `bibleInstructor: "Ana Paula"`, `lastVisit: 2026-03-10`, plus 1 history entry (`SPOKE`, `name: "Ana Paula"`), `isImported: true`.
- Row 2 (`Campinas`): `positionIndex: 1`, `note: "Mapa 01"`, `lastVisit: 2026-01-15`, plus 1 history entry (`MOVED`, `name: "Marcos"`), `isImported: true`.
- Row 3 (`Valinhos`): `positionIndex: 0`, `note: "Mapa 02: Portão branco"`, `peopleQuantity: 2`, `icon: "cp"`, `lastVisit: 2026-02-20`, plus 1 history entry (`REVISIT`, `isRevisit: true`, `name: "Pedro"`), `isImported: true`.
- Row 4 (`Valinhos`): `positionIndex: 1`, `note: "Mapa 03"`, `lastVisit: null`, `recentHistory: []`, no history subcollection doc, `isImported: true`.

---

## 6. Pre-Output Checklist for the AI

Before saving or returning the `.tsv` file, verify all 8 checks:
- [ ] **Check 1:** Line 1 has the exact 14 column names separated by `\t`.
- [ ] **Check 2:** No line has more than 13 `\t` characters (14 columns).
- [ ] **Check 3:** Every `city` matches one of the congregation's configured cities in Firestore.
- [ ] **Check 4:** Every `icon` is only `m`, `w`, `c`, `cp`, `o`, or empty (never `h`, `f`, `Homem`, `Mulher`).
- [ ] **Check 5:** Every `isBibleStudent` and `isRevisit` is `true`, `false`, or empty (never `Sim`/`Não`).
- [ ] **Check 6:** Every `lastVisit` is `YYYY-MM-DD` or empty (never `DD/MM/YYYY`, and never fabricate a date when the source has none).
- [ ] **Check 7:** Every non-empty `mapsLink` starts with `http://` or `https://`, and no two rows share both the same `address` and the same `mapsLink`.

---

## 7. How the AI Should Parse Raw Input Files (`.xlsx`, `.csv`, `.pdf`, etc.)

Congregation files come in many shapes. Do **not** try to convert binary files (`.xlsx`, `.pdf`, `.docx`) by reading them as raw text; first run a small Python extraction script to dump all rows and embedded hyperlinks cleanly.

### 7.1 Excel (`.xlsx` / `.xls`)
- **Gotcha 1 (Multiple tabs):** Congregations often put one city or one map group (`Mapa 01`, `Mapa 02`) per worksheet tab. Always list and iterate over **all** `workbook.sheetnames` — the tab name itself is often the `city` or `mapGroup`!
- **Gotcha 2 (Hidden hyperlinks):** Google Maps links are frequently attached as clickable hyperlinks on an address cell or a cell whose visible text just says `"Link"` or `"Mapa"`. Plain `pandas.read_excel()` drops hyperlink targets! Use `openpyxl` and read `cell.hyperlink.target`:
  ```python
  import openpyxl

  wb = openpyxl.load_workbook("source.xlsx", data_only=True)
  for sheet_name in wb.sheetnames:
      ws = wb[sheet_name]
      print(f"=== SHEET: {sheet_name} ===")
      for row_idx, row in enumerate(ws.iter_rows(), start=1):
          values = []
          for cell in row:
              val = "" if cell.value is None else str(cell.value).strip()
              link = cell.hyperlink.target if cell.hyperlink else ""
              values.append(f"{val} [LINK: {link}]" if link and link != val else val)
          if any(values):
              print(f"Row {row_idx}: " + " | ".join(values))
  ```

### 7.2 CSV / TSV (`.csv`, `.tsv`, `.txt`)
- **Gotcha (Delimiter & Encoding):** Brazilian Excel exports often use `;` as delimiter and `latin-1` / `cp1252` or UTF-8-BOM (`utf-8-sig`) encoding.
  ```python
  import csv

  for enc in ("utf-8-sig", "cp1252", "latin-1"):
      try:
          with open("source.csv", encoding=enc, newline="") as f:
              sample = f.read(4096)
              f.seek(0)
              dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
              for i, row in enumerate(csv.reader(f, dialect), start=1):
                  print(f"Row {i}: " + " | ".join(c.strip() for c in row))
          break
      except UnicodeDecodeError:
          continue
  ```

### 7.3 PDF (`.pdf`)
- **Gotcha (Clickable link annotations):** PDFs exported from spreadsheets or territory cards often hide the Google Maps URL inside a PDF `/Link` annotation rather than visible text. Extract both text/tables and page `/Annots` URIs:
  ```python
  from pypdf import PdfReader

  reader = PdfReader("source.pdf")
  for i, page in enumerate(reader.pages, start=1):
      print(f"=== PAGE {i} ===")
      print(page.extract_text())
      for annot in page.get("/Annots") or []:
          obj = annot.get_object()
          uri = obj.get("/A", {}).get("/URI")
          if uri:
              print(f"  [LINK]: {uri}")
  ```
- If the PDF is a scanned image (`extract_text()` returns empty), use OCR or vision on each rendered page.

---

## 8. Running the Importer CLI

First build `../../..`:

```bash
npm --prefix functions/ministry-maps run build
```

### Dry Run (Recommended First Step)
Validates the congregation in Firestore, parses and validates every row in the TSV, and prints the planned summary per city without writing to Firestore:

```bash
# Against local Firestore emulator
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm --prefix functions/ministry-maps run import:territories -- \
  --congregation-id=<CONGREGATION_ID> \
  --file=/absolute/path/to/territories.tsv \
  --dry-run

# Against production Firestore
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npm --prefix functions/ministry-maps run import:territories -- \
  --congregation-id=<CONGREGATION_ID> \
  --file=/absolute/path/to/territories.tsv \
  --dry-run
```

### Live Run
Remove `--dry-run` once the dry run reports 0 validation errors and the city counts look right:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npm --prefix functions/ministry-maps run import:territories -- \
  --congregation-id=<CONGREGATION_ID> \
  --file=/absolute/path/to/territories.tsv
```
