#!/usr/bin/env python3
"""
Tests for pdf2epub_tts.

  * Pure-function tests run with no dependencies (stdlib only).
  * The end-to-end test needs reportlab (to build the sample PDF) and an extractor
    (pdftotext or pdfplumber); it self-skips if either is missing.

Run:  python3 -m pytest tests/         (or)   python3 tests/test_core.py
"""

from __future__ import annotations

import os
import shutil
import sys
import zipfile
from xml.dom import minidom

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pdf2epub_tts as p  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------------------
# Pure-function unit tests
# ---------------------------------------------------------------------------

def test_footnote_ref_stripping():
    cfg = p.Config()
    # "observation.5" -> footnote ref removed; the year 1949 must survive.
    out = p.clean_paragraph(["This began in 1949 as an observation.5"], cfg)
    assert out == "This began in 1949 as an observation."
    # decade "1990s" and "9/11" must not be touched
    assert "1990s" in p.clean_paragraph(["It was the 1990s"], cfg)


def test_dehyphenation_across_lines():
    cfg = p.Config()
    out = p.clean_paragraph(["to exam-", "ine its consequences"], cfg)
    assert out == "to examine its consequences"


def test_ligature_normalization():
    cfg = p.Config()
    out = p.clean_paragraph(["a diﬃcult and ﬁne case"], cfg)  # ffi, fi ligatures
    assert out == "a difficult and fine case"


def test_citation_stripping():
    cfg = p.Config(strip_citations=True, strip_footnote_refs=False)
    out = p.clean_paragraph(
        ["The archive is never neutral (Smith 2004: 33), as noted [12]."], cfg)
    assert "Smith 2004" not in out
    assert "[12]" not in out
    assert out.startswith("The archive is never neutral")
    assert out.endswith(".")  # punctuation tidied, no stray spaces


def test_citation_stripping_off_by_default():
    cfg = p.Config()
    out = p.clean_paragraph(["as noted (Smith 2004)."], cfg)
    assert "(Smith 2004)" in out


def test_junk_lines():
    assert p.is_junk_line("6067_Book.indd 3")
    assert p.is_junk_line("EBSCOhost")
    assert p.is_junk_line("42")
    assert p.is_junk_line("| 42")
    assert not p.is_junk_line("This is real body text.")


def test_min_para_words_filter():
    det = p.Detection(
        pages=["Chapter One\n\nA\n\nThis paragraph has several words in it indeed."],
        head_counts=p.Counter(), running_heads=set(), book_title_head=None,
        chapter_titles=[], start_index=0, end_index=1)
    cfg = p.Config(detect_chapters=False, min_para_words=3)
    items = p.assemble(det, cfg)
    paras = [t for k, t in items if k == "p"]
    assert any("several words" in t for t in paras)
    assert not any(t == "A" for t in paras)  # too short, dropped


def test_detection_finds_chapters_and_matter():
    pages = (
        ["Title Page\n\nThe Book"]
        + ["The Book\n\nOne\n\nbody body body"] * 5     # book-title running head
        + ["Intro\n\nintro text here now"] * 4          # chapter running head 'Intro'
        + ["Method\n\nmethod text here now"] * 4        # chapter running head 'Method'
        + ["Bibliography\n\nrefs here"] * 2             # back matter
    )
    cfg = p.Config()
    det = p.detect(pages, cfg)
    assert "Intro" in det.chapter_titles
    assert "Method" in det.chapter_titles
    assert det.book_title_head == "The Book"
    # back matter dropped: end index lands on the first Bibliography page
    assert det.end_index == len(pages) - 2


# ---------------------------------------------------------------------------
# EPUB structure test (no PDF needed — build from synthetic items)
# ---------------------------------------------------------------------------

def test_build_epub_structure(tmp_path=None):
    out = os.path.join(HERE, "_struct.epub")
    items = [("h1", "Introduction"), ("p", "First paragraph."),
             ("h1", "The Argument"), ("p", "Second paragraph."), ("p", "Third.")]
    cfg = p.Config(title="Test Book", author="A. Writer")
    summary = p.build_epub(items, cfg, out)
    try:
        assert len(summary) == 2
        with zipfile.ZipFile(out) as z:
            names = z.namelist()
            # mimetype must be first entry and stored uncompressed
            assert names[0] == "mimetype"
            assert z.getinfo("mimetype").compress_type == zipfile.ZIP_STORED
            assert z.read("mimetype") == b"application/epub+zip"
            for req in ("META-INF/container.xml", "OEBPS/content.opf",
                        "OEBPS/toc.ncx", "OEBPS/nav.xhtml"):
                assert req in names, req
                minidom.parseString(z.read(req))            # well-formed XML
            opf = z.read("OEBPS/content.opf").decode()
            assert "version='3.0'" in opf
            assert "properties='nav'" in opf
            assert "dcterms:modified" in opf
            # every chapter xhtml is well-formed and titled
            chaps = [n for n in names if n.startswith("OEBPS/chap_")]
            assert len(chaps) == 2
            for ch in chaps:
                minidom.parseString(z.read(ch))
    finally:
        if os.path.exists(out):
            os.remove(out)


# ---------------------------------------------------------------------------
# End-to-end: real PDF -> EPUB
# ---------------------------------------------------------------------------

def _have_extractor() -> bool:
    if shutil.which("pdftotext"):
        return True
    try:
        import pdfplumber  # noqa: F401
        return True
    except ImportError:
        return False


def test_end_to_end():
    try:
        import reportlab  # noqa: F401
    except ImportError:
        print("SKIP end-to-end: reportlab not installed")
        return
    if not _have_extractor():
        print("SKIP end-to-end: no pdftotext or pdfplumber")
        return

    from make_sample_pdf import build
    pdf = build()
    out = os.path.join(HERE, "_e2e.epub")
    txt = os.path.splitext(out)[0] + ".txt"

    cfg = p.Config(title="The Order of Things", author="M. F.",
                   strip_citations=True, drop_footnotes=True, emit_text=True,
                   running_head_min_count=2)  # short sample: heads repeat only 2-3x
    summary = p.convert(pdf, out, cfg)
    try:
        titles = [t for t, _ in summary]
        # front matter (title page, Contents) and back matter (Bibliography) dropped
        assert "Introduction" in titles
        assert "The Argument" in titles
        assert "Consequences" in titles
        assert not any("Bibliography" in t for t in titles)

        body = open(txt, encoding="utf-8").read()
        # de-hyphenation joined "exam-\nine"
        assert "examine" in body
        # inline footnote refs stripped ("observation.5" -> "observation.")
        assert "observation." in body and "observation.5" not in body
        # citation stripped
        assert "Smith 2004" not in body
        # footnote block text dropped
        assert "left to the reader" not in body
        assert "appendix, which we omit" not in body
        # furniture gone
        assert "EBSCO" not in body
        assert ".indd" not in body
    finally:
        for f in (out, txt):
            if os.path.exists(f):
                os.remove(f)


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"PASS  {fn.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL  {fn.__name__}: {e}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"ERROR {fn.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(fns) - failed}/{len(fns)} passed")
    sys.exit(1 if failed else 0)
