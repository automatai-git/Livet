// Minimal, spec-valid EPUB 3 writer built on JSZip. Produces a single .epub
// Blob from a `book` model:
//
//   book = {
//     title, author, language,
//     chapters: [ { title, paragraphs: [string, ...] }, ... ]
//   }
//
// The output is deliberately plain: one XHTML file per chapter, a shared
// stylesheet, an EPUB3 nav document plus an EPUB2 NCX for maximum reader
// compatibility (ElevenReader, Apple Books, Calibre, etc.). No images, no
// scripting — exactly the quiet, linear text a TTS audiobook wants.

import JSZip from 'jszip';

export function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// A stable-per-book id without Math.random (unavailable in some sandboxes and
// bad for reproducibility). Derived from the title + a counter.
function bookUuid(book) {
  const seed = `${book.title}|${book.author}|${book.chapters.length}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `urn:uuid:${hex}-0000-4000-8000-000000000000`;
}

function chapterFilename(i) {
  return `chapter-${String(i + 1).padStart(3, '0')}.xhtml`;
}

function chapterXhtml(chapter, lang) {
  const title = escapeXml(chapter.title || 'Chapter');
  const body = chapter.paragraphs
    .map((p) => `    <p>${escapeXml(p)}</p>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeXml(lang)}" lang="${escapeXml(lang)}">
  <head>
    <meta charset="utf-8"/>
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
  </head>
  <body>
    <section epub:type="chapter" xmlns:epub="http://www.idpf.org/2007/ops">
    <h1>${title}</h1>
${body}
    </section>
  </body>
</html>`;
}

const STYLESHEET = `/* Quiet, readable defaults. TTS ignores most of this, but it keeps the
   EPUB pleasant to open in a visual reader too. */
body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; margin: 5%; }
h1 { font-family: Georgia, serif; font-size: 1.5em; margin: 1.5em 0 1em; line-height: 1.3; }
p { margin: 0 0 0.9em; text-align: justify; text-indent: 1.2em; }
p:first-of-type { text-indent: 0; }
`;

function containerXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

function contentOpf(book, uuid) {
  const lang = book.language || 'en';
  const items = book.chapters.map((c, i) => {
    const id = `chap${i + 1}`;
    return {
      manifest: `    <item id="${id}" href="${chapterFilename(i)}" media-type="application/xhtml+xml"/>`,
      spine: `    <itemref idref="${id}"/>`,
    };
  });
  // A single, fixed modified timestamp keeps output reproducible; readers only
  // require the field to be present and well-formed.
  const modified = '2024-01-01T00:00:00Z';
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${escapeXml(lang)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${uuid}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>
    <dc:creator>${escapeXml(book.author || 'Unknown')}</dc:creator>
    <dc:language>${escapeXml(lang)}</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
${items.map((i) => i.manifest).join('\n')}
  </manifest>
  <spine toc="ncx">
${items.map((i) => i.spine).join('\n')}
  </spine>
</package>`;
}

function navXhtml(book) {
  const lang = book.language || 'en';
  const links = book.chapters
    .map((c, i) => `        <li><a href="${chapterFilename(i)}">${escapeXml(c.title || `Chapter ${i + 1}`)}</a></li>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(lang)}" lang="${escapeXml(lang)}">
  <head>
    <meta charset="utf-8"/>
    <title>${escapeXml(book.title)}</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Contents</h1>
      <ol>
${links}
      </ol>
    </nav>
  </body>
</html>`;
}

function tocNcx(book, uuid) {
  const points = book.chapters
    .map((c, i) => `    <navPoint id="navpoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(c.title || `Chapter ${i + 1}`)}</text></navLabel>
      <content src="${chapterFilename(i)}"/>
    </navPoint>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(book.title)}</text></docTitle>
  <navMap>
${points}
  </navMap>
</ncx>`;
}

// Assemble the EPUB and resolve to a Blob. The `mimetype` entry MUST be the
// first entry and stored uncompressed per the OCF spec.
export async function buildEpub(book) {
  if (!book || !Array.isArray(book.chapters) || book.chapters.length === 0) {
    throw new Error('Cannot build EPUB: no chapters.');
  }
  const lang = book.language || 'en';
  const uuid = bookUuid(book);
  const zip = new JSZip();

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', containerXml());

  const oebps = zip.folder('OEBPS');
  oebps.file('content.opf', contentOpf(book, uuid));
  oebps.file('nav.xhtml', navXhtml(book));
  oebps.file('toc.ncx', tocNcx(book, uuid));
  oebps.file('style.css', STYLESHEET);
  book.chapters.forEach((c, i) => {
    oebps.file(chapterFilename(i), chapterXhtml(c, lang));
  });

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// Convenience: the assembled plain text of the whole book, for previews and
// word-count stats.
export function bookToPlainText(book) {
  return book.chapters
    .map((c) => `${c.title || ''}\n\n${c.paragraphs.join('\n\n')}`)
    .join('\n\n\n');
}
