import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { escapeXml, buildEpub, bookToPlainText } from './epub';

const book = {
  title: 'Test & Sample',
  author: 'A. Writer',
  language: 'en',
  chapters: [
    { title: 'One', paragraphs: ['Hello world.', 'Second <para>.'] },
    { title: 'Two', paragraphs: ['Another chapter.'] },
  ],
};

describe('escapeXml', () => {
  it('escapes the five XML entities', () => {
    expect(escapeXml(`<a b="c" d='e' & f>`)).toBe('&lt;a b=&quot;c&quot; d=&apos;e&apos; &amp; f&gt;');
  });
});

describe('buildEpub', () => {
  it('produces a valid OCF zip with mimetype stored first', async () => {
    const blob = await buildEpub(book);
    expect(blob.size).toBeGreaterThan(0);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    // mimetype present with exact content
    expect(await zip.file('mimetype').async('string')).toBe('application/epub+zip');
    // core OCF files exist
    expect(zip.file('META-INF/container.xml')).toBeTruthy();
    expect(zip.file('OEBPS/content.opf')).toBeTruthy();
    expect(zip.file('OEBPS/nav.xhtml')).toBeTruthy();
    expect(zip.file('OEBPS/toc.ncx')).toBeTruthy();
    expect(zip.file('OEBPS/chapter-001.xhtml')).toBeTruthy();
    expect(zip.file('OEBPS/chapter-002.xhtml')).toBeTruthy();
  });

  it('escapes content and lists every chapter in the spine + nav', async () => {
    const blob = await buildEpub(book);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const opf = await zip.file('OEBPS/content.opf').async('string');
    expect(opf).toContain('Test &amp; Sample');
    expect((opf.match(/<itemref /g) || [])).toHaveLength(2);

    const ch = await zip.file('OEBPS/chapter-001.xhtml').async('string');
    expect(ch).toContain('<p>Hello world.</p>');
    expect(ch).toContain('Second &lt;para&gt;.');

    const nav = await zip.file('OEBPS/nav.xhtml').async('string');
    expect(nav).toContain('chapter-001.xhtml');
    expect(nav).toContain('chapter-002.xhtml');
  });

  it('throws when there are no chapters', async () => {
    await expect(buildEpub({ title: 'x', chapters: [] })).rejects.toThrow();
  });
});

describe('bookToPlainText', () => {
  it('concatenates titles and paragraphs', () => {
    const txt = bookToPlainText(book);
    expect(txt).toContain('One');
    expect(txt).toContain('Hello world.');
    expect(txt).toContain('Another chapter.');
  });
});
