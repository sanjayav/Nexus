# Spreadsheet Formulas

Nexus's data-entry spreadsheet supports Excel-style formulas via
[HyperFormula](https://hyperformula.handsontable.com) — an open-source,
client-side formula engine compatible with 380+ Excel functions. Type
`=` in the value column on the **Data entry spreadsheet** page (or in
the formula bar above the grid) to start a formula.

## Where formulas live

| Surface                  | Formulas? | Notes |
| ------------------------ | --------- | ----- |
| Data entry spreadsheet   | Yes       | Numeric cells only — status pills and assignee pickers are unaffected. |
| Legacy single-row editor | No        | Deep-edit page stays formula-free; reopen the spreadsheet to author formulas. |
| Disclosure editor        | No        | Narrative surface; not a grid. |

## Supported functions (excerpt)

The full list is in [HyperFormula's docs](https://hyperformula.handsontable.com/guide/built-in-functions.html).
Common picks used by ESG reporting:

- **Math**: `SUM`, `SUMIF`, `SUMIFS`, `AVERAGE`, `COUNT`, `COUNTA`,
  `COUNTIF`, `COUNTIFS`, `MIN`, `MAX`, `ROUND`, `ABS`, `SQRT`, `POWER`
- **Logic**: `IF`, `AND`, `OR`, `NOT`, `IFS`, `IFERROR`
- **Lookup**: `VLOOKUP`, `HLOOKUP`, `INDEX`, `MATCH`, `XLOOKUP`
- **Text**: `CONCATENATE`, `LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`,
  `UPPER`, `LOWER`
- **Date**: `YEAR`, `MONTH`, `DAY`, `DATE`, `DATEDIF`, `TODAY`

### `TODAY()` is stamped at save

To stop a stale browser tab silently shifting numbers tomorrow, `TODAY()`
is replaced with a literal `DATE(yyyy,mm,dd)` at the moment of save.
A formula like `=YEAR(TODAY())` becomes `=YEAR(DATE(2026,6,3))` in the
persisted row.

## Cross-sheet references

Each grid mounts a single `Disclosures` sheet by default. When the
spreadsheet is opened with multiple frameworks selected, additional
sheets named after the framework code are added (e.g. `gri`, `csrd`).
Reference them with the standard Excel syntax:

```
='gri'!D5            ← read row 5 of the value column from the GRI sheet
=SUM('csrd'!D2:D50)   ← total CSRD scope-1 sources
```

Quote the sheet name with single quotes — codes that contain digits or
special characters need it; bare names like `'gri'` keep it for
consistency.

## Errors

HyperFormula maps invalid formulas to Excel-compatible error codes,
rendered in the cell in red with the full message on hover:

| Code       | When |
| ---------- | ---- |
| `#DIV/0!`  | Division by zero |
| `#NAME?`   | Unknown function or unquoted identifier |
| `#REF!`    | Reference to a deleted/out-of-range cell |
| `#VALUE!`  | Type mismatch (e.g. `=SUM("a", 1)`) |
| `#NUM!`    | Numeric overflow / invalid argument |
| `#N/A`     | Lookup miss |

A formula that errors still persists — the formula bar shows the
original text so the user can fix it in place.

## Formula bar

The grey strip above the grid is the formula bar.

```
[ D5 ] [ fx ] [ =SUM(D1:D4)                                          ] [ Help ]
```

- The pill on the left shows the active cell's A1 reference. Columns
  follow the displayed column order — the value column is always `D`.
- Editing in the bar applies the same parsing as in-cell edits.
- **Enter** commits; **Esc** reverts; **Tab** commits and lets focus
  advance.
- **Help** opens a popover with worked examples (SUM, COUNTIF, IF,
  cross-sheet, conversion).

## Storage shape

When a user enters a formula, the server persists **both** the raw text
and the precomputed numeric so the report generators stay
formula-agnostic.

```sql
-- question_assignments
value     NUMERIC     -- engine-computed result (or the plain user input)
formula   TEXT        -- raw "=..." text, NULL for plain values

-- activity_data
activity_value NUMERIC NOT NULL  -- computed
formula        TEXT              -- raw

-- data_value (workflow mirror)
value          NUMERIC NOT NULL
formula        TEXT
computed_value NUMERIC           -- result when formula present
computed_at    TIMESTAMPTZ
```

Downstream report generators read `value` (or `computed_value` on
`data_value`) and never touch HyperFormula — formulas are evaluated
client-side only.

## Performance

- The engine is **lazy-loaded** via `import('../lib/formulas')` so the
  ~400KB HyperFormula bundle stays out of the main chunk.
- One engine instance per spreadsheet view; rebuilt only when the
  filtered row order changes.
- Cells call `engine.destroy()` on unmount so a long session doesn't
  leak the formula graph.

HyperFormula benchmarks at ~100K cells; the data-entry grid typically
shows under 500.

## Licence

HyperFormula is dual-licensed (GPLv3 / commercial). Nexus uses the
`'gpl-v3'` licence key. We comply with the GPL by linking dynamically
and not redistributing HyperFormula as a standalone product. If we ever
ship HyperFormula as part of a downloadable artefact, swap to a
commercial key.

## Adding new sheets

For now the grid is single-sheet (`Disclosures`). To enable per-framework
tabs:

1. Call `engine.addSheet('<framework_code>')` when the user toggles a
   framework on.
2. Re-seed the sheet using `loadAssignmentsToEngine(engine, rows, code)`.
3. Cross-sheet formulas (`='gri'!D5`) start resolving immediately.

The engine wrapper exposes `addSheet`, `hasSheet`, and the per-sheet
APIs needed for this in `src/lib/formulas.ts`.
