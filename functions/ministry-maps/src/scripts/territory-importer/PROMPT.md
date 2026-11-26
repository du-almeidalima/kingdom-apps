# Local AI Prompt Template — Territory TSV Converter

Copy the prompt inside the block below, fill in the 2 placeholders at the bottom (`ALLOWED_CITIES` and `SOURCE_FILE_OR_RAW_DATA`), and send it to your local model.

> **Tip for smaller/local models:** If the congregation file has more than ~50 rows, ask the model to first extract the raw rows with Python into a plain list, and then convert them in chunks of 30–50 rows at a time so it doesn't lose track of tab columns.

---

## Copy-Paste Prompt

````markdown
You are a strict data-conversion assistant. Convert the congregation territory file/data specified at the bottom of this prompt into a valid 14-column Tab-Separated Values (`.tsv`) file.

Follow every rule below literally. Do not guess or invent column names or enum values.

### 1. HOW TO READ THE SOURCE FILE FIRST (IF GIVEN A FILE PATH)
Do not read binary files (`.xlsx`, `.pdf`, `.docx`) as raw text. Use Python to extract all rows and hidden hyperlinks first:

- **Excel (`.xlsx`):**
  - Iterate over **ALL** worksheet tabs (`wb.sheetnames`) — congregations often put one city or one `mapGroup` (`Mapa 01`, `Mapa 02`) per tab!
  - Use `openpyxl` (`wb = openpyxl.load_workbook(path, data_only=True)`) and inspect `cell.hyperlink.target` on every cell! Plain `pandas.read_excel()` loses clickable Google Maps links hidden inside cells whose visible text just says `"Link"` or the address.
- **CSV (`.csv`):**
  - Brazilian CSVs often use `;` as delimiter and `utf-8-sig` or `cp1252`/`latin-1` encoding. Use Python's `csv` module to parse properly.
- **PDF (`.pdf`):**
  - Use `pypdf` (`PdfReader`) or `pdfplumber` to extract both page text/tables AND clickable link annotations (`page.get("/Annots")` -> `obj["/A"]["/URI"]`) so embedded Google Maps links are not lost.

### 2. OUTPUT FORMAT
1. Output (or save) a `.tsv` file where columns are separated by a single TAB character (`\t`). NEVER use commas (`,`) or semicolons (`;`) as column delimiters.
2. Line 1 of the `.tsv` MUST be this exact 14-column header line (case-sensitive):
city	address	note	mapGroup	mapsLink	icon	peopleQuantity	positionIndex	isBibleStudent	bibleInstructor	lastVisit	visitOutcome	isRevisit	visitPublisher
3. Every data row must have the 14 columns in that exact order.
4. When an optional value is missing/unknown, leave the cell completely empty between tabs (`\t\t`). NEVER write `null`, `N/A`, `-`, `none`, or `undefined`.
5. Replace any line breaks or tabs inside a text value with a single space. Do not wrap cells in quotes.

### 3. COLUMN RULES (1 to 14)

1. `city` (REQUIRED):
   - Must match one of the `ALLOWED_CITIES` listed at the bottom, character-for-character (including accents and capitalization).

2. `address` (REQUIRED):
   - Street name, number, apartment/complement, and neighborhood (e.g. `Rua das Flores, 123 - Apto 4, Centro`).

3. `note` (Optional):
   - Resident name, reference points, gate/intercom details, or family remarks (e.g. `João - Portão verde ao lado da padaria`).
   - DO NOT put the map/card number (`mapGroup`) here.

4. `mapGroup` (Optional):
   - Original map or card identifier from the spreadsheet or tab name (e.g. `Mapa 01`, `Cartão 3B`).
   - DO NOT combine `mapGroup` and `note` yourself; keep them in their separate columns.

5. `mapsLink` (Optional):
   - Full URL starting with `http://` or `https://`.
   - The combination of `(address + mapsLink)` MUST BE UNIQUE across the file. Two residents in the same building can share the same `mapsLink` if their `address` differs (e.g. different apartment numbers). If two rows have the exact same `address` AND the exact same `mapsLink`, merge them into one row with `peopleQuantity` increased (and both names in `note`), or distinguish their `address`.

6. `icon` (Optional — USE ONLY THESE 5 LOWERCASE CODES):
   - `m`  = Homem / Masculino / Rapaz (Man)
   - `w`  = Mulher / Feminino / Moça (Woman)
   - `c`  = Criança / Menino / Menina (Child)
   - `cp` = Casal / Marido e Esposa (Couple)
   - `o`  = Outro / Não informado / Desconhecido (Other — use `o` whenever gender/profile is unknown)
   - WARNING: NEVER output `h` for Homem, NEVER output `m` for Mulher, and NEVER write Portuguese words like `Homem` or `Mulher`.

7. `peopleQuantity` (Optional):
   - Positive integer (`1`, `2`, `3`, ...). Default to `1` if not mentioned. Never write `0`.

8. `positionIndex` (Optional):
   - Leave completely EMPTY unless an explicit 0-based order (`0`, `1`, `2`...) is requested.

9. `isBibleStudent` (Optional):
   - Write ONLY `true` or `false` (lowercase). Default to `false`. NEVER write `Sim` or `Não`.

10. `bibleInstructor` (Optional):
    - Name of the Bible instructor if `isBibleStudent` is `true` and the name is known; otherwise leave empty.

11. `lastVisit` (Optional — `YYYY-MM-DD`):
    - Convert Brazilian dates (`DD/MM/YYYY` or `DD/MM/YY`) to `YYYY-MM-DD` (example: `14/03/2026` -> `2026-03-14`).
    - Must be a real calendar date.
    - If a row has a visit status (like `Mudou-se` or `Revisita`) or a publisher name, but has NO date in the source file, leave `lastVisit` completely EMPTY (never invent a date — the importer program automatically sets today's date when `lastVisit` is blank).

12. `visitOutcome` (Optional — USE ONLY THESE 5 UPPERCASE KEYS):
    - `SPOKE`                    = Conversou / Atendeu / Visitado
    - `NOT_ANSWERED`             = Não estava / Não atendeu / Casa fechada
    - `MOVED`                    = Mudou-se / Se mudou / Não mora mais lá
    - `ASKED_TO_NOT_VISIT_AGAIN` = Pediu para não visitar / Não visitar
    - `REVISIT`                  = Revisita / Voltar a visitar / Interessado
    - Leave empty if never visited.

13. `isRevisit` (Optional):
    - Write `true` if the territory is an active revisit (`visitOutcome` is `REVISIT`), otherwise `false` (or empty if never visited). NEVER write `Sim` or `Não`.

14. `visitPublisher` (Optional):
    - Name of the publisher who made the last visit (`lastVisit`). Leave empty if unknown or never visited.

### 4. EXAMPLE

Input:
- ALLOWED_CITIES: `["Campinas", "Valinhos"]`
- Row A: Mapa 01 | Campinas | Rua Barão de Jaguara, 500, Centro | Maria (Mulher) | Estudante da Bíblia com Ana Paula | Visitado em 10/03/2026 por Ana Paula (Conversou) | https://maps.app.goo.gl/abc111
- Row B: Mapa 02 | Valinhos | Rua Itália, 88, Jd. Ribeiro | Casal (2 pessoas), portão branco | Revisita (sem data informada) feita por Pedro | Sem link
- Row C: Mapa 03 | Valinhos | Rua Doze de Outubro, 45 | Sem dados, nunca visitado | https://maps.app.goo.gl/abc444

Output:
```tsv
city	address	note	mapGroup	mapsLink	icon	peopleQuantity	positionIndex	isBibleStudent	bibleInstructor	lastVisit	visitOutcome	isRevisit	visitPublisher
Campinas	Rua Barão de Jaguara, 500, Centro	Maria	Mapa 01	https://maps.app.goo.gl/abc111	w	1		true	Ana Paula	2026-03-10	SPOKE	false	Ana Paula
Valinhos	Rua Itália, 88, Jd. Ribeiro	Portão branco	Mapa 02		cp	2		false			REVISIT	true	Pedro
Valinhos	Rua Doze de Outubro, 45		Mapa 03	https://maps.app.goo.gl/abc444	o	1		false
```

### 5. SELF-CHECK BEFORE RESPONDING
Verify every line of your output against these checks:
1. Line 1 is the exact 14-column header separated by `\t`.
2. `city` is one of `ALLOWED_CITIES`.
3. `icon` is only `m`, `w`, `c`, `cp`, or `o` (never `h`, `Homem`, `Mulher`).
4. `isBibleStudent` and `isRevisit` are only `true`, `false`, or empty.
5. `lastVisit` is `YYYY-MM-DD` or empty (never `DD/MM/YYYY`, and never invented when missing).
6. No two rows share both the same `address` and the same `mapsLink`.

---

### 6. INPUT DATA TO CONVERT

ALLOWED_CITIES

SOURCE_FILE_OR_RAW_DATA:
````
