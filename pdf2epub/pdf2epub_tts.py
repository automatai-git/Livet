#!/usr/bin/env python3
"""
pdf2epub_tts.py — Turn a text-layer PDF into a clean, chaptered EPUB for text-to-speech.

WHY THIS EXISTS
    Naive PDF->EPUB conversion (e.g. Calibre "PDF reflow") dumps page furniture — running
    heads, page numbers, print/InDesign artifacts, library watermarks (EBSCO etc.) — inline
    with the body, and often mangles fi/fl/ffi ligatures ("diffi cult", "fi rst"). A TTS
    engine (ElevenReader, Speechify, Apple Books read-aloud, ...) then reads all of that
    garbage aloud. This tool instead pulls the PDF's *text layer*, strips the furniture,
    de-hyphenates line breaks, drops back-matter (Notes / Bibliography / Index), removes
    inline footnote-reference numbers, optionally drops bottom-of-page footnote blocks and
    parenthetical citations, and rebuilds a properly chaptered EPUB 3 (with an EPUB 2 NCX
    fallback so the reader shows a real table of contents) that reads cleanly start to finish.

    It does NOT OCR. It relies on the PDF having a real text layer (most published academic
    PDFs do). If the PDF is a scan, run OCR first (e.g. `ocrmypdf in.pdf out.pdf`) and feed
    the result in.

QUICK START
    # Inspect what it detects — writes nothing, tune from here:
    python3 pdf2epub_tts.py book.pdf --report

    # Produce the EPUB with sensible defaults (drops front/back matter, strips footnote refs):
    python3 pdf2epub_tts.py book.pdf -o book.epub --title "..." --author "..."

    # Academic profile: also drop bottom-of-page footnotes and inline (Author 2004) citations:
    python3 pdf2epub_tts.py book.pdf -o book.epub --drop-footnotes --strip-citations

    # Keep the endnotes/bibliography, keep footnote numbers, force a single chapter:
    python3 pdf2epub_tts.py book.pdf -o book.epub --keep-notes --keep-footnote-refs --no-chapters

DEPENDENCIES
    Text extraction uses whichever is available, in order of preference:
      1. pdftotext        (poppler-utils)   -> apt-get install poppler-utils   [best quality]
      2. pdfplumber       (pip install pdfplumber)                             [pure-python]
    `--drop-footnotes` needs per-word font sizes and therefore forces the pdfplumber path
    (pdftotext discards font sizes). EPUB writing has no dependencies (stdlib zipfile).

REFINING THIS TOOL (with Claude Code or by hand)
    The knobs live in a few places:
      * the Config dataclass below  — thresholds, matter names, toggles
      * JUNK_LINE_PATTERNS          — regexes for furniture/watermark lines to delete
      * CITATION_PATTERNS           — regexes for inline citations (with --strip-citations)
    Everything else is small, single-purpose functions. Start with --report on a new book;
    if a chapter is missed or junk leaks through, adjust the relevant knob and re-report.
"""

from __future__ import annotations

import argparse
import html
import os
import re
import shutil
import subprocess
import sys
import unicodedata
import zipfile
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class Config:
    # Metadata (falls back to guessing from filename if left None)
    title: str | None = None
    author: str | None = None
    language: str = "en"

    # Running-head / chapter auto-detection
    #   A "running head" is the first non-empty line of a page. If the same short line
    #   appears at the top of many pages, it is furniture (book title on verso, chapter
    #   title on recto) and gets stripped. The most frequent one is assumed to be the book
    #   title; the rest are treated as chapter titles, and a change between them marks a
    #   new chapter.
    running_head_min_count: int = 4        # appears at page-top >= N times => furniture
    running_head_max_len: int = 70         # ... and is at most this many chars
    detect_chapters: bool = True

    # Which running-head names begin the back matter to drop (case-insensitive, exact match).
    backmatter_names: tuple[str, ...] = (
        "notes", "bibliography", "index", "references", "endnotes",
        "notes and references", "works cited", "further reading",
    )
    drop_backmatter: bool = True

    # Front matter: by default, drop everything before the first detected chapter
    # (title page, series ads, contents, list of abbreviations). Override with --keep-front-matter
    # or pin the start with --start-at "Introduction".
    drop_frontmatter: bool = True
    start_at: str | None = None            # manual: begin at first page whose running head == this
    end_before: str | None = None          # manual: stop before first page whose running head == this

    # Text cleanup toggles
    dehyphenate: bool = True               # join "exam-\nple" -> "example"
    strip_footnote_refs: bool = True       # remove superscript note numbers glued to words: "text.53"
    strip_citations: bool = False          # remove inline (Author 2004) / [12] citations
    min_para_words: int = 0                # drop paragraphs with fewer than N words (0 = keep all)

    # Bottom-of-page footnote removal (needs pdfplumber; ignored on the pdftotext path).
    drop_footnotes: bool = False
    footnote_size_ratio: float = 0.86      # a line is "small" if its font size <= body_size * ratio
    footnote_bottom_frac: float = 0.55     # only drop small lines whose top is in the lower (1-frac) page

    # Debug
    emit_text: bool = False                # also write a .txt of the cleaned body next to the epub


# Furniture / watermark lines removed anywhere they appear. Extend for new publishers.
JUNK_LINE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("indesign_artifact", re.compile(r"^\S*\.indd\b", re.I)),                # 6067_Book.indd 55
    ("print_timestamp",   re.compile(r"^\d{1,2}/\d{1,2}/\d{2,4}\s+\d{1,2}:\d{2}\s*(AM|PM)?\.?$", re.I)),
    ("ebsco_watermark",   re.compile(r"\bEBSCO(host)?\b", re.I)),
    ("copyright_watermark", re.compile(r"Copyright ©.*(All rights reserved|reproduced)", re.I)),
    ("printed_on_via",    re.compile(r"printed on .* via", re.I)),
    ("page_number",       re.compile(r"^[0-9ivxlcdm]{1,6}$", re.I)),         # arabic or roman page no.
    ("page_number_pipe",  re.compile(r"^\|?\s*\d{1,4}\s*\|?$")),             # "| 42" / "42 |"
]

# Footnote reference: 1-3 digits glued to the end of a word/closing punctuation, then whitespace.
# Deliberately does NOT match years ("in 1949" — space before) or "1990s"/"9/11".
FOOTNOTE_REF = re.compile(r"(?<=[A-Za-z.,;:’'”\")])\d{1,3}(?=(\s|$))")

# Inline citations removed with --strip-citations. Order matters (bracket form first).
CITATION_PATTERNS: list[re.Pattern] = [
    re.compile(r"\[\s*\d+(?:\s*[,–-]\s*\d+)*\s*\]"),                          # [12]  [3, 5]  [7–9]
    re.compile(r"\(\s*(?:ibid|op\.?\s*cit|loc\.?\s*cit|cf|see also|see)\b[^()]*\)", re.I),
    re.compile(                                                              # (Smith 2004: 33) / (Smith and Jones, 2011)
        r"\(\s*(?:[A-Z][A-Za-z’'-]+(?:\s+(?:and|&|et al\.?)\s+[A-Z][A-Za-z’'-]+)*,?\s+)?"
        r"\d{4}[a-z]?(?:\s*[:,]\s*\d+(?:[-–]\d+)?)?\s*\)"
    ),
]

# Unicode typographic ligatures -> ASCII. Always applied; 100% safe.
LIGATURES = {
    "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl",
    "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "ft", "ﬆ": "st",
}


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def _extract_pdftotext(pdf_path: str) -> list[str]:
    """poppler `pdftotext` in reflow mode -> list of page texts."""
    out = subprocess.run(
        ["pdftotext", pdf_path, "-"], capture_output=True, text=True, check=True
    )
    return out.stdout.split("\f")


def _extract_pdfplumber(pdf_path: str, cfg: Config) -> list[str]:
    """pdfplumber -> list of page texts, optionally dropping small-font footnote blocks."""
    try:
        import pdfplumber  # type: ignore
    except ImportError:
        sys.exit(
            "ERROR: need a PDF text extractor. Install poppler-utils (pdftotext) "
            "or `pip install pdfplumber`."
        )
    pages: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        if cfg.drop_footnotes:
            body_size = _estimate_body_font_size(pdf)
        for page in pdf.pages:
            if cfg.drop_footnotes:
                pages.append(_page_text_dropping_footnotes(page, body_size, cfg))
            else:
                pages.append(page.extract_text() or "")
    return pages


def _line_groups(words: list[dict], y_tol: float = 3.0) -> list[list[dict]]:
    """Group pdfplumber words into visual lines by their top coordinate."""
    lines: list[list[dict]] = []
    for w in sorted(words, key=lambda w: (round(w["top"] / y_tol), w["x0"])):
        if lines and abs(w["top"] - lines[-1][0]["top"]) <= y_tol:
            lines[-1].append(w)
        else:
            lines.append([w])
    return lines


def _median(values: list[float]) -> float:
    s = sorted(values)
    n = len(s)
    if not n:
        return 0.0
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def _estimate_body_font_size(pdf) -> float:
    """Global modal per-line font size across a sample of pages = the body text size."""
    sizes: Counter = Counter()
    sample = pdf.pages[: min(len(pdf.pages), 30)]
    for page in sample:
        words = page.extract_words(extra_attrs=["size"])
        for line in _line_groups(words):
            med = _median([w.get("size", 0) or 0 for w in line])
            if med:
                sizes[round(med, 1)] += len(line)   # weight by word count
    return sizes.most_common(1)[0][0] if sizes else 0.0


def _page_text_dropping_footnotes(page, body_size: float, cfg: Config) -> str:
    """Rebuild page text, dropping a contiguous small-font block at the bottom of the page."""
    words = page.extract_words(extra_attrs=["size"])
    if not words or body_size <= 0:
        return page.extract_text() or ""
    lines = _line_groups(words)
    page_h = float(page.height)
    threshold = body_size * cfg.footnote_size_ratio
    bottom_start = page_h * cfg.footnote_bottom_frac

    keep = [True] * len(lines)
    # Walk lines bottom-up; drop the trailing run of small-font lines sitting in the lower page.
    for i in range(len(lines) - 1, -1, -1):
        med = _median([w.get("size", 0) or 0 for w in lines[i]])
        top = min(w["top"] for w in lines[i])
        if med and med <= threshold and top >= bottom_start:
            keep[i] = False
        else:
            break  # stop at the first normal-size / high line — don't punch holes in the body
    out_lines = [
        " ".join(w["text"] for w in ln) for ln, k in zip(lines, keep) if k
    ]
    return "\n".join(out_lines)


def extract_pages(pdf_path: str, cfg: Config) -> list[str]:
    """Return the PDF text as a list of per-page strings."""
    if cfg.drop_footnotes:
        # Font sizes are required; pdftotext discards them.
        return _extract_pdfplumber(pdf_path, cfg)
    if shutil.which("pdftotext"):
        return _extract_pdftotext(pdf_path)
    return _extract_pdfplumber(pdf_path, cfg)


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

def first_nonempty(page: str) -> str:
    for line in page.split("\n"):
        if line.strip():
            return line.strip()
    return ""


def is_junk_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    return any(p.search(s) for _, p in JUNK_LINE_PATTERNS)


@dataclass
class Detection:
    pages: list[str]
    head_counts: Counter
    running_heads: set          # all furniture head lines to strip
    book_title_head: str | None # most frequent head (verso running title)
    chapter_titles: list[str]   # ordered, de-duplicated chapter running heads
    start_index: int
    end_index: int


def detect(pages: list[str], cfg: Config) -> Detection:
    heads = [first_nonempty(p) for p in pages]
    counts = Counter(h for h in heads if h)

    running_heads = {
        h for h, c in counts.items()
        if c >= cfg.running_head_min_count and len(h) <= cfg.running_head_max_len
    }
    book_title_head = counts.most_common(1)[0][0] if counts else None

    # chapter titles = frequent running heads that are not the book title
    chapter_head_set = {h for h in running_heads if h != book_title_head}

    # ordered chapter list, in first-appearance order, excluding back matter
    ordered, seen = [], set()
    for h in heads:
        if h in chapter_head_set and h not in seen and h.lower() not in cfg.backmatter_names:
            ordered.append(h)
            seen.add(h)

    # ---- body range ----
    start_index = 0
    if cfg.start_at:
        start_index = next((i for i, h in enumerate(heads)
                            if h.lower() == cfg.start_at.lower()), 0)
    elif cfg.drop_frontmatter and ordered:
        start_index = next((i for i, h in enumerate(heads) if h in chapter_head_set), 0)

    end_index = len(pages)
    if cfg.end_before:
        end_index = next((i for i, h in enumerate(heads)
                         if i > start_index and h.lower() == cfg.end_before.lower()), len(pages))
    elif cfg.drop_backmatter:
        end_index = next((i for i, h in enumerate(heads)
                         if i > start_index and h.lower() in cfg.backmatter_names), len(pages))

    return Detection(pages, counts, running_heads, book_title_head,
                     ordered, start_index, end_index)


# ---------------------------------------------------------------------------
# Cleanup + assembly
# ---------------------------------------------------------------------------

def normalize_ligatures(text: str) -> str:
    for lig, rep in LIGATURES.items():
        text = text.replace(lig, rep)
    return text


def strip_citations(text: str) -> str:
    for pat in CITATION_PATTERNS:
        text = pat.sub("", text)
    return text


def clean_paragraph(lines: list[str], cfg: Config) -> str:
    """Join soft-wrapped lines into one paragraph, de-hyphenating and de-noising."""
    text = ""
    for ln in lines:
        ln = ln.strip()
        if not text:
            text = ln
        elif cfg.dehyphenate and text.endswith("-"):
            text = text[:-1] + ln
        else:
            text = text + " " + ln
    text = normalize_ligatures(text)
    text = re.sub(r"\s+", " ", text).strip()
    if cfg.strip_footnote_refs:
        text = FOOTNOTE_REF.sub("", text)
    if cfg.strip_citations:
        text = strip_citations(text)
    # tidy whitespace left by removed refs/citations
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    text = re.sub(r"\s{2,}", " ", text).strip()
    return text


def assemble(det: Detection, cfg: Config) -> list[tuple[str, str]]:
    """Return an ordered list of ('h1', title) / ('p', text) items."""
    items: list[tuple[str, str]] = []
    para_lines: list[str] = []
    current_chapter: str | None = None
    chapter_set = set(det.chapter_titles)

    def flush():
        nonlocal para_lines
        if para_lines:
            t = clean_paragraph(para_lines, cfg)
            if t and (cfg.min_para_words <= 0 or len(t.split()) >= cfg.min_para_words):
                items.append(("p", t))
            para_lines = []

    for i in range(det.start_index, det.end_index):
        page = det.pages[i]
        rh = first_nonempty(page)

        if cfg.detect_chapters and rh in chapter_set and rh != current_chapter:
            flush()
            items.append(("h1", rh))
            current_chapter = rh

        # strip running head (first non-empty line if it's furniture) + junk lines
        stripped_head = False
        body: list[str] = []
        for line in page.split("\n"):
            if not stripped_head and line.strip():
                stripped_head = True
                if line.strip() in det.running_heads or is_junk_line(line):
                    continue
            if is_junk_line(line):
                continue
            body.append(line)

        while body and not body[0].strip():
            body.pop(0)
        while body and not body[-1].strip():
            body.pop()

        # blank line => paragraph break; page boundary does NOT flush, so paragraphs
        # split across a page continue (correct de-hyphenation / merge).
        for line in body:
            if not line.strip():
                flush()
            else:
                para_lines.append(line)
    flush()

    # guarantee at least one chapter wrapper
    if cfg.detect_chapters and not any(k == "h1" for k, _ in items):
        items.insert(0, ("h1", det.book_title_head or "Text"))
    return items


# ---------------------------------------------------------------------------
# EPUB writer (EPUB 3 nav + EPUB 2 NCX fallback, stdlib only)
# ---------------------------------------------------------------------------

def _group_chapters(items: list[tuple[str, str]], title: str) -> list[tuple[str, list[str]]]:
    chapters: list[tuple[str, list[str]]] = []
    cur_title, cur_ps = title, []
    started = False
    for kind, text in items:
        if kind == "h1":
            if started:
                chapters.append((cur_title, cur_ps))
            cur_title, cur_ps, started = text, [], True
        else:
            cur_ps.append("<p>" + html.escape(text) + "</p>")
            started = True
    chapters.append((cur_title, cur_ps))
    return chapters


def build_epub(items: list[tuple[str, str]], cfg: Config, out_path: str) -> list[tuple[str, int]]:
    title = cfg.title or "Untitled"
    author = cfg.author or "Unknown"
    book_id = "urn:uuid:pdf2epub-" + re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    modified = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    chapters = _group_chapters(items, title)

    work = out_path + ".build"
    if os.path.isdir(work):
        shutil.rmtree(work)
    os.makedirs(work + "/OEBPS")
    os.makedirs(work + "/META-INF")

    with open(work + "/OEBPS/style.css", "w", encoding="utf-8") as fh:
        fh.write(
            "body{font-family:serif;line-height:1.5;margin:1em}"
            "h1{margin:1.2em 0 .6em}p{margin:0 0 .8em;text-align:justify}"
        )

    manifest, spine, ncx_nav, nav_items, summary = [], [], [], [], []
    for n, (ctitle, ps) in enumerate(chapters):
        fn = f"chap_{n:03d}.xhtml"
        with open(f"{work}/OEBPS/{fn}", "w", encoding="utf-8") as fh:
            fh.write(
                "<?xml version='1.0' encoding='utf-8'?>\n"
                "<html xmlns='http://www.w3.org/1999/xhtml' "
                "xmlns:epub='http://www.idpf.org/2007/ops' xml:lang='" + cfg.language + "'>"
                "<head><meta charset='utf-8'/>"
                f"<title>{html.escape(ctitle)}</title>"
                "<link rel='stylesheet' type='text/css' href='style.css'/></head><body>"
                f"<h1>{html.escape(ctitle)}</h1>\n" + "\n".join(ps) + "</body></html>"
            )
        manifest.append(f"<item id='c{n}' href='{fn}' media-type='application/xhtml+xml'/>")
        spine.append(f"<itemref idref='c{n}'/>")
        ncx_nav.append(f"<navPoint id='n{n}' playOrder='{n+1}'><navLabel><text>"
                       f"{html.escape(ctitle)}</text></navLabel><content src='{fn}'/></navPoint>")
        nav_items.append(f"<li><a href='{fn}'>{html.escape(ctitle)}</a></li>")
        summary.append((ctitle, sum(len(p.split()) for p in ps)))

    # EPUB 3 navigation document (this is what a modern reader uses for its ToC)
    with open(work + "/OEBPS/nav.xhtml", "w", encoding="utf-8") as fh:
        fh.write(
            "<?xml version='1.0' encoding='utf-8'?>\n"
            "<html xmlns='http://www.w3.org/1999/xhtml' "
            "xmlns:epub='http://www.idpf.org/2007/ops' xml:lang='" + cfg.language + "'>"
            "<head><meta charset='utf-8'/><title>Contents</title></head><body>"
            "<nav epub:type='toc' id='toc'><h1>Contents</h1><ol>"
            + "".join(nav_items) + "</ol></nav></body></html>"
        )

    # OPF package (EPUB 3, with the NCX kept as a legacy fallback)
    with open(work + "/OEBPS/content.opf", "w", encoding="utf-8") as fh:
        fh.write(
            "<?xml version='1.0' encoding='utf-8'?>\n"
            "<package xmlns='http://www.idpf.org/2007/opf' version='3.0' unique-identifier='bookid'>"
            "<metadata xmlns:dc='http://purl.org/dc/elements/1.1/'>"
            f"<dc:title>{html.escape(title)}</dc:title>"
            f"<dc:creator>{html.escape(author)}</dc:creator>"
            f"<dc:language>{cfg.language}</dc:language>"
            f"<dc:identifier id='bookid'>{html.escape(book_id)}</dc:identifier>"
            f"<meta property='dcterms:modified'>{modified}</meta></metadata>"
            "<manifest>"
            "<item id='nav' href='nav.xhtml' media-type='application/xhtml+xml' properties='nav'/>"
            "<item id='ncx' href='toc.ncx' media-type='application/x-dtbncx+xml'/>"
            "<item id='css' href='style.css' media-type='text/css'/>"
            + "".join(manifest) + "</manifest>"
            "<spine toc='ncx'>" + "".join(spine) + "</spine></package>"
        )
    with open(work + "/OEBPS/toc.ncx", "w", encoding="utf-8") as fh:
        fh.write(
            "<?xml version='1.0' encoding='utf-8'?>\n"
            "<ncx xmlns='http://www.daisy.org/z3986/2005/ncx/' version='2005-1'>"
            f"<head><meta name='dtb:uid' content='{html.escape(book_id)}'/></head>"
            f"<docTitle><text>{html.escape(title)}</text></docTitle>"
            "<navMap>" + "".join(ncx_nav) + "</navMap></ncx>"
        )
    with open(work + "/META-INF/container.xml", "w", encoding="utf-8") as fh:
        fh.write(
            "<?xml version='1.0'?>\n<container version='1.0' "
            "xmlns='urn:oasis:names:tc:opendocument:xmlns:container'><rootfiles>"
            "<rootfile full-path='OEBPS/content.opf' "
            "media-type='application/oebps-package+xml'/></rootfiles></container>"
        )
    with open(work + "/mimetype", "w", encoding="utf-8") as fh:
        fh.write("application/epub+zip")

    if os.path.exists(out_path):
        os.remove(out_path)
    with zipfile.ZipFile(out_path, "w") as z:
        # mimetype MUST be first and stored (uncompressed) per the EPUB OCF spec
        z.write(work + "/mimetype", "mimetype", compress_type=zipfile.ZIP_STORED)
        for root, _, files in os.walk(work):
            for f in sorted(files):
                if f == "mimetype":
                    continue
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, work), compress_type=zipfile.ZIP_DEFLATED)
    shutil.rmtree(work)

    if cfg.emit_text:
        with open(os.path.splitext(out_path)[0] + ".txt", "w", encoding="utf-8") as fh:
            for kind, text in items:
                fh.write(("\n# " + text + "\n\n") if kind == "h1" else text + "\n\n")
    return summary


# ---------------------------------------------------------------------------
# Reporting / high-level API
# ---------------------------------------------------------------------------

def guess_meta_from_filename(path: str) -> tuple[str, str | None]:
    stem = re.sub(r"[-_]+", " ", os.path.splitext(os.path.basename(path))[0])
    stem = re.sub(r"\b\d{9,13}\b", "", stem)  # drop ISBNs
    stem = re.sub(r"\bcompress\b", "", stem, flags=re.I).strip()
    stem = unicodedata.normalize("NFKC", stem)
    return (stem.title() if stem else "Untitled"), None


def convert(pdf_path: str, out_path: str, cfg: Config) -> list[tuple[str, int]]:
    """End-to-end: PDF path -> EPUB written at out_path. Returns per-chapter (title, words)."""
    if cfg.title is None:
        cfg.title, guessed_author = guess_meta_from_filename(pdf_path)
        cfg.author = cfg.author or guessed_author
    pages = extract_pages(pdf_path, cfg)
    det = detect(pages, cfg)
    items = assemble(det, cfg)
    return build_epub(items, cfg, out_path)


def print_report(det: Detection, cfg: Config) -> None:
    print(f"pages: {len(det.pages)}")
    print(f"body range: pages {det.start_index}..{det.end_index} "
          f"(dropped {det.start_index} front + {len(det.pages) - det.end_index} back)")
    print(f"book-title running head (stripped): {det.book_title_head!r}")
    print(f"\ndetected chapters ({len(det.chapter_titles)}):")
    for c in det.chapter_titles:
        print(f"  - {c}  ({det.head_counts[c]} pages)")
    print("\nother frequent page-top lines being stripped as furniture:")
    for h in sorted(det.running_heads - set(det.chapter_titles) - {det.book_title_head}):
        print(f"  - {h!r} ({det.head_counts[h]})")
    print("\n(Use --start-at / --end-before / --keep-front-matter / --keep-notes to adjust.)")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_config_from_args(args: argparse.Namespace) -> Config:
    return Config(
        title=args.title, author=args.author, language=args.language,
        drop_backmatter=not args.keep_notes,
        drop_frontmatter=not args.keep_front_matter,
        strip_footnote_refs=not args.keep_footnote_refs,
        strip_citations=args.strip_citations,
        min_para_words=args.min_para_words,
        drop_footnotes=args.drop_footnotes,
        running_head_min_count=args.min_head_count,
        detect_chapters=not args.no_chapters,
        start_at=args.start_at, end_before=args.end_before,
        emit_text=args.emit_text,
    )


def add_common_args(ap: argparse.ArgumentParser) -> None:
    ap.add_argument("--title")
    ap.add_argument("--author")
    ap.add_argument("--language", default="en")
    ap.add_argument("--keep-notes", action="store_true", help="keep Notes/Bibliography/Index")
    ap.add_argument("--keep-front-matter", action="store_true")
    ap.add_argument("--keep-footnote-refs", action="store_true",
                    help="do not strip superscript footnote numbers")
    ap.add_argument("--strip-citations", action="store_true",
                    help="remove inline (Author 2004) and [12] citations")
    ap.add_argument("--drop-footnotes", action="store_true",
                    help="drop bottom-of-page footnote blocks (forces the pdfplumber path)")
    ap.add_argument("--min-para-words", type=int, default=0,
                    help="drop paragraphs with fewer than N words (default 0 = keep all)")
    ap.add_argument("--min-head-count", type=int, default=Config.running_head_min_count,
                    help="a page-top line is furniture/chapter if it repeats >= N times "
                         f"(default {Config.running_head_min_count}; lower for short documents)")
    ap.add_argument("--no-chapters", action="store_true", help="one flat chapter")
    ap.add_argument("--start-at", help="begin at first page whose running head == TEXT")
    ap.add_argument("--end-before", help="stop before first page whose running head == TEXT")
    ap.add_argument("--emit-text", action="store_true", help="also write a .txt sidecar")


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Clean a text-layer PDF into a chaptered, TTS-ready EPUB.")
    ap.add_argument("pdf", help="input PDF (must have a real text layer; OCR scans first)")
    ap.add_argument("-o", "--out", help="output .epub path")
    ap.add_argument("--report", action="store_true",
                    help="print detection summary and exit without writing")
    add_common_args(ap)
    args = ap.parse_args()

    cfg = build_config_from_args(args)
    if cfg.title is None:
        cfg.title, guessed_author = guess_meta_from_filename(args.pdf)
        cfg.author = cfg.author or guessed_author

    if args.report:
        pages = extract_pages(args.pdf, cfg)
        det = detect(pages, cfg)
        print_report(det, cfg)
        return

    out = args.out or (os.path.splitext(args.pdf)[0] + " - clean.epub")
    summary = convert(args.pdf, out, cfg)

    total = sum(w for _, w in summary)
    print(f"wrote {out}  ({os.path.getsize(out):,} bytes)")
    print(f"chapters: {len(summary)}   words: {total:,}")
    for ctitle, w in summary:
        print(f"  {w:6d}  {ctitle}")


if __name__ == "__main__":
    main()
