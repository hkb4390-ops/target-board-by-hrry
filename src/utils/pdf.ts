/** Google's viewer renders any public PDF inside an iframe, including on phones where Chrome cannot show PDFs inline. */
export const googleViewerUrl = (pdfUrl: string) =>
  `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;

const safeName = (title: string) =>
  (title || 'Notes').replace(/\s*\/\/\s*/g, ' - ').replace(/[^\p{L}\p{N}_\-\s().]/gu, '').trim() || 'Notes';

/**
 * Real download: fetch the file and save it as a blob so the browser downloads instead of navigating.
 * If the host blocks that (CORS), fall back to opening the file in a new tab where the browser offers Save.
 */
export async function downloadPdf(url: string, title: string): Promise<'saved' | 'opened'> {
  const name = `${safeName(title)}.pdf`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = new Blob([await res.arrayBuffer()], { type: 'application/pdf' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10000);
    return 'saved';
  } catch {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noreferrer'; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    return 'opened';
  }
}
