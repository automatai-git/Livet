#!/usr/bin/env python3
"""
batch.py — convert a whole folder of PDFs to clean TTS-ready EPUBs.

    python3 batch.py ./pdfs -o ./epubs --drop-footnotes --strip-citations

Every *.pdf in the input directory becomes <name>.epub in the output directory
(default: ./epub-out). All of pdf2epub_tts's cleanup flags are accepted and applied
uniformly. Per-book title/author are guessed from each filename; use the single-file
converter when you need to override metadata for one book.
"""

from __future__ import annotations

import argparse
import os
import sys
import traceback

from pdf2epub_tts import add_common_args, build_config_from_args, convert


def main() -> None:
    ap = argparse.ArgumentParser(description="Batch-convert a folder of PDFs to TTS-ready EPUBs.")
    ap.add_argument("indir", help="directory containing .pdf files (searched recursively)")
    ap.add_argument("-o", "--outdir", default="./epub-out", help="output directory (default ./epub-out)")
    ap.add_argument("--flat", action="store_true", help="ignore subfolders; write all EPUBs into outdir root")
    add_common_args(ap)
    # --title/--author are meaningless for a batch (they would apply to every book); drop them.
    args = ap.parse_args()
    args.title = None
    args.author = None

    pdfs: list[str] = []
    for root, _, files in os.walk(args.indir):
        for f in sorted(files):
            if f.lower().endswith(".pdf"):
                pdfs.append(os.path.join(root, f))
    if not pdfs:
        sys.exit(f"no PDFs found under {args.indir!r}")

    os.makedirs(args.outdir, exist_ok=True)
    ok = fail = 0
    for pdf in pdfs:
        rel = os.path.relpath(pdf, args.indir)
        stem = os.path.splitext(os.path.basename(pdf) if args.flat else rel)[0]
        out = os.path.join(args.outdir, stem + ".epub")
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
        try:
            cfg = build_config_from_args(args)   # fresh config per book (title is per-file)
            summary = convert(pdf, out, cfg)
            words = sum(w for _, w in summary)
            print(f"[ok]   {rel}  ->  {out}  ({len(summary)} ch, {words:,} words)")
            ok += 1
        except Exception as e:  # keep going through the rest of the batch
            print(f"[FAIL] {rel}: {e}", file=sys.stderr)
            traceback.print_exc()
            fail += 1

    print(f"\ndone: {ok} converted, {fail} failed -> {args.outdir}")
    if fail:
        sys.exit(1)


if __name__ == "__main__":
    main()
