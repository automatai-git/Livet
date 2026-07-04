#!/usr/bin/env python3
"""
Generate a synthetic "academic" PDF that exercises every cleanup path:

  * a book-title running head on verso pages + chapter running heads on recto pages
    (the real convention the detector is built around)
  * page numbers at the bottom
  * an InDesign artifact + an EBSCO watermark line (furniture)
  * body text with inline superscript footnote references and (Author 2004) citations
  * a smaller-font footnote block at the bottom of body pages
  * a hyphenated word split across a page break (into a page whose running head is stripped)
  * front matter (title page, Contents) and a back-matter "Bibliography" that get dropped

Requires reportlab (`pip install reportlab`). Writes tests/sample.pdf.
"""

from __future__ import annotations

import os

from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "sample.pdf")

BOOK_TITLE = "The Order of Things"


def _page(c, running_head, body_lines, page_no, footnotes=None):
    w, h = A5
    if running_head:
        c.setFont("Times-Italic", 9)
        c.drawString(50, h - 40, running_head)                  # running head (furniture)

    c.setFont("Times-Roman", 11)
    y = h - 70
    for line in body_lines:
        c.drawString(50, y, line)
        y -= 16

    if footnotes:
        c.setFont("Times-Roman", 7.5)                            # smaller font => detectable footnotes
        fy = 95
        for fn in footnotes:
            c.drawString(50, fy, fn)
            fy -= 11

    c.setFont("Times-Roman", 9)
    c.drawCentredString(w / 2, 30, str(page_no))                 # page number (furniture)
    c.showPage()


def build() -> str:
    c = canvas.Canvas(OUT, pagesize=A5)
    n = 0

    def page(head, lines, footnotes=None):
        nonlocal n
        n += 1
        _page(c, head, lines, n, footnotes)

    # --- front matter (dropped: comes before the first detected chapter) ---
    page(BOOK_TITLE, ["The Order of Things", "", "A Study in Method", "", "University Press"])
    page("Contents", ["Contents", "", "Introduction", "The Argument", "Consequences"])

    # --- Introduction: recto (chapter head) / verso (book head) / recto ---
    page("Introduction", [
        "This study begins from a simple observation.5 The archive is",
        "never neutral, as many have argued (Smith 2004: 33). What",
        "follows is an attempt to take that claim seriously and to exam-",
    ], footnotes=["5. See the extended discussion in the appendix, which we omit here.",
                  "6067_Book.indd 3"])
    page(BOOK_TITLE, [                                            # running head stripped -> "examine" joins
        "ine its consequences for how we read.12 The method here is",
        "comparative throughout (see also Jones 2011), and provisional.",
    ], footnotes=["12. A fuller treatment appears in the endnotes."])
    page("Introduction", [
        "We proceed, then, without any promise of completeness.",
        "The stakes are nonetheless real for how classification works.",
    ])

    # --- The Argument ---
    page("The Argument", [
        "The central argument can be stated plainly.3 Categories are not",
        "found in the world; they are made and remade over time.",
    ], footnotes=["3. This echoes an older debate we need not rehearse.",
                  "EBSCOhost - printed on 2024-01-01 via institutional login"])
    page(BOOK_TITLE, [
        "That making is neither arbitrary nor wholly determined.",
        "It has, as we shall see, a history and a grammar of its own.",
    ])
    page("The Argument", [
        "To trace that grammar is the work of the chapters that follow.",
        "Nothing in it requires us to abandon ordinary description.",
    ])

    # --- Consequences ---
    page("Consequences", [
        "If the argument holds, several consequences follow at once.1",
        "First, no classification is ever simply given (cf. Foucault 1966).",
    ], footnotes=["1. The remaining consequences are left to the reader."])
    page(BOOK_TITLE, [
        "Second, every ordering carries the trace of its own history.",
        "Third, and last, revision is not failure but method.",
    ])
    page("Consequences", [
        "With that, the argument is complete, if not yet fully proved.",
        "The rest is a matter of patient and unglamorous work.",
    ])

    # --- back matter (dropped) ---
    page("Bibliography", [
        "Bibliography",
        "Foucault, M. (1966). The Order of Things. Paris: Gallimard.",
        "Smith, J. (2004). Archives and Method. Cambridge UP.",
    ])
    page("Index", ["Index", "archive, 3", "classification, 6-9", "method, 3-5"])

    c.save()
    return OUT


if __name__ == "__main__":
    print("wrote", build())
