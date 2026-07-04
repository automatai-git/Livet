# pdf2epub-tts

Turn book PDFs — especially **academic texts with heavy footnotes, citations, and
page furniture** — into clean, chaptered EPUBs you can import into
[ElevenReader](https://elevenreader.io/) (or any other read-aloud app) and listen to
as an audiobook **without a text-to-speech voice reading the noise aloud**.

Naïve PDF→EPUB conversion (Calibre "PDF reflow", most online tools) dumps everything
into the text: running heads, page numbers, "6067_Book.indd 55", EBSCO watermarks,
superscript footnote numbers, bottom-of-page footnotes, and `(Smith 2004: 33)`
citations. A TTS engine then dutifully reads all of it. This tool pulls the PDF's
**text layer**, strips that furniture, drops the Notes/Bibliography/Index back matter,
de-hyphenates line breaks, and rebuilds a properly chaptered EPUB 3 (with an EPUB 2 NCX
fallback so the reader shows a real table of contents).

> It does **not** OCR. It needs a real text layer (published academic PDFs have one).
> For a scanned PDF, OCR it first: `ocrmypdf scan.pdf ocr.pdf`, then feed in `ocr.pdf`.

---

## Install

The EPUB writer is pure standard library. You only need a **text extractor**:

```bash
# Best quality — poppler's pdftotext (a system package, not pip):
sudo apt-get install poppler-utils        # Debian/Ubuntu
brew install poppler                       # macOS

# Pure-Python fallback, and REQUIRED for --drop-footnotes (needs font sizes):
pip install -r requirements.txt            # installs pdfplumber
```

If `pdftotext` is on your `PATH`, no `pip install` is needed at all — unless you want
`--drop-footnotes`.

---

## Quick start

```bash
# 1. See what it detects (chapters, furniture, matter to drop). Writes nothing:
python3 pdf2epub_tts.py book.pdf --report

# 2. Convert with sensible defaults (drops front/back matter, strips footnote refs):
python3 pdf2epub_tts.py book.pdf -o book.epub --title "The Order of Things" --author "M. Foucault"

# 3. Academic profile — also drop bottom-of-page footnotes and inline citations:
python3 pdf2epub_tts.py book.pdf -o book.epub --drop-footnotes --strip-citations
```

Then in ElevenReader: **Library → Add → Upload** the `.epub` and press play. The
chapters you saw in `--report` become the audiobook's navigation.

### Recommended for academic texts

```bash
python3 pdf2epub_tts.py book.pdf -o book.epub \
    --drop-footnotes \      # remove the small-font footnote block at the page bottom
    --strip-citations \     # remove (Author 2004) and [12] from the read-aloud text
    --title "…" --author "…"
```

`--drop-footnotes` is the big one for academic work and it **requires pdfplumber**
(footnote detection uses font sizes, which `pdftotext` throws away). Without it,
bottom-of-page footnotes flow inline and get read aloud — and can even interrupt a
sentence that hyphenates across the page break.

---

## Workflow: tune with `--report`, then convert

`--report` prints the detection without writing a file, so you can dial the knobs in:

```
pages: 320
body range: pages 14..298 (dropped 14 front + 22 back)
book-title running head (stripped): 'The Order of Things'

detected chapters (9):
  - Introduction  (18 pages)
  - The Classical Age  (41 pages)
  ...
other frequent page-top lines being stripped as furniture:
  - 'PART ONE' (6)
```

- **A chapter is missing / merged?** Its running head repeats fewer times than
  `--min-head-count` (default 4). Lower it: `--min-head-count 2`.
- **Front matter kept / body starts too early?** Pin it: `--start-at "Introduction"`
  or keep everything with `--keep-front-matter`.
- **Notes/Bibliography being read aloud?** They should auto-drop; if the section has an
  unusual name, use `--end-before "Appendix"`. To *keep* them, `--keep-notes`.
- **A publisher watermark leaks through?** Add a regex to `JUNK_LINE_PATTERNS` at the
  top of `pdf2epub_tts.py`.

---

## All options

| Flag | Effect |
|------|--------|
| `-o, --out PATH` | Output `.epub` (default: `<pdf> - clean.epub`) |
| `--report` | Print detection summary and exit; write nothing |
| `--title` / `--author` / `--language` | Metadata (title/author guessed from filename if omitted) |
| `--drop-footnotes` | Drop the small-font footnote block at the bottom of each page *(needs pdfplumber)* |
| `--strip-citations` | Remove inline `(Author 2004)`, `(ibid.)`, `[12]` citations |
| `--keep-footnote-refs` | Keep superscript footnote numbers glued to words (`text.53`) |
| `--keep-notes` | Keep the Notes/Bibliography/Index back matter |
| `--keep-front-matter` | Keep the title page / contents / abbreviations front matter |
| `--no-chapters` | Emit a single flat chapter |
| `--start-at TEXT` | Begin at the first page whose running head equals `TEXT` |
| `--end-before TEXT` | Stop before the first page whose running head equals `TEXT` |
| `--min-head-count N` | A page-top line is furniture/chapter if it repeats ≥ N times (default 4) |
| `--min-para-words N` | Drop paragraphs shorter than N words (kills stray caption/number fragments) |
| `--emit-text` | Also write a `.txt` of the cleaned body next to the EPUB (great for spot-checking) |

Tip: run once with `--emit-text` and skim the `.txt` — it's the fastest way to catch
junk that slipped through before you commit to listening.

---

## Batch a whole folder

```bash
python3 batch.py ./pdfs -o ./epubs --drop-footnotes --strip-citations
```

Every `*.pdf` under `./pdfs` (recursively) becomes `<name>.epub` in `./epubs`, with
per-book title/author guessed from each filename. All the cleanup flags above apply
uniformly. One book failing doesn't stop the batch. Use `--flat` to ignore subfolders.

---

## What it cleans (and how)

| Noise | Handling |
|-------|----------|
| Running heads (book title / chapter title at page top) | Detected by frequency, stripped; chapter heads become the EPUB's chapters |
| Page numbers, `\| 42 \|` | Regex furniture patterns |
| InDesign artifacts (`*.indd 55`), print timestamps | Regex furniture patterns |
| EBSCO / copyright / "printed on … via" watermarks | Regex furniture patterns |
| Superscript footnote references (`observation.5`) | Stripped, without touching years (`1949`), decades (`1990s`), or `9/11` |
| Bottom-of-page footnotes | `--drop-footnotes`: small-font contiguous block at page bottom, via font-size clustering |
| Inline citations `(Author 2004: 33)`, `[12]`, `(ibid.)` | `--strip-citations` |
| Hyphenation across line/page breaks (`exam-\nple`) | Re-joined |
| `ﬁ ﬂ ﬃ` Unicode ligatures | Normalized to `fi fl ffi` (always on) |
| Front matter / Notes / Bibliography / Index | Dropped by default (`--keep-*` to retain) |

The output is **EPUB 3** with a `nav.xhtml` table of contents plus a legacy `toc.ncx`,
so both modern (ElevenReader) and older readers show proper chapter navigation. The
`mimetype` entry is stored first and uncompressed per the OCF spec.

---

## Limitations (be realistic)

- **No OCR.** Scanned PDFs with no text layer produce nothing useful — OCR them first.
- **Footnote detection is heuristic.** It assumes footnotes are a smaller font sitting
  at the bottom of the page. Sidenotes, endnotes-as-footnotes, and multi-column layouts
  can fool it. Always spot-check with `--emit-text`.
- **Chapter detection is frequency-based.** Books without running heads, or with the
  same head on every page, may need `--no-chapters` or manual `--start-at`/`--end-before`.
- **Two-column / figure-heavy pages** reflow imperfectly; `pdftotext`'s reading order is
  usually good but not perfect.

---

## Tests

```bash
pip install pdfplumber reportlab          # reportlab only needed to build the sample PDF
python3 tests/test_core.py                 # or: python3 -m pytest tests/
```

The suite unit-tests the cleaning/detection functions and runs a full PDF→EPUB
round-trip against a synthetic academic PDF (running heads, page numbers, footnote
refs, a bottom footnote block, a citation, a cross-page hyphenation, and drop-worthy
front/back matter). It self-skips the end-to-end case if `reportlab`/an extractor is
absent.
