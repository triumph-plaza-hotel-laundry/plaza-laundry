import { logoUrl } from '@/assets/images';

export type EnterprisePrintOptions = {
  /** Kept for caller compatibility; not rendered in the print header. */
  title: string;
  /** Kept for caller compatibility; not rendered in the print header. */
  subtitle?: string;
  /** Kept for caller compatibility; not rendered in the print header. */
  printedBy: string;
  /**
   * Content to print — HTMLElement, CSS selector, or raw HTML string.
   * Only this content is printed (plus the enterprise header/footer).
   */
  source: HTMLElement | string;
  /** Optional language direction for the print sheet */
  dir?: 'ltr' | 'rtl';
};

const ROOT_ID = 'enterprise-print-root';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function resolveSourceHtml(source: HTMLElement | string): string {
  if (typeof source === 'string') {
    if (source.trim().startsWith('<')) {
      return source;
    }
    const el = document.querySelector(source);
    if (!el) {
      throw new Error(`Print source not found: ${source}`);
    }
    return (el as HTMLElement).outerHTML;
  }
  return source.outerHTML;
}

function ensurePrintRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('aria-hidden', 'true');
    document.body.appendChild(root);
  }
  return root;
}

function formatPrintDateTime(): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());
}

/**
 * Opens the browser Print Preview for a section of the app using the
 * official Triumph Plaza Hotel Laundry enterprise print template.
 * Non-destructive: does not alter on-screen layouts.
 *
 * Header (repeating): large official logo + Date/Time only.
 * Page numbers use @page margin boxes (Page X of Y).
 */
export function printEnterpriseDocument(
  options: EnterprisePrintOptions,
): void {
  const root = ensurePrintRoot();
  const bodyHtml = resolveSourceHtml(options.source);
  const printedAt = formatPrintDateTime();
  const dir = options.dir ?? 'ltr';
  // title / subtitle / printedBy retained for API compatibility; not shown in header.
  void options.title;
  void options.subtitle;
  void options.printedBy;

  root.innerHTML = `
    <table class="ep-sheet" dir="${dir}">
      <thead>
        <tr>
          <td>
            <header class="ep-header">
              <div class="ep-header__brand">
                <img alt="Triumph Plaza Hotel" class="ep-header__logo" src="${logoUrl}" />
              </div>
              <div class="ep-header__meta">
                <p class="ep-header__datetime">${escapeHtml(printedAt)}</p>
              </div>
            </header>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <main class="ep-body">${bodyHtml}</main>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td>
            <footer class="ep-footer">
              <span>Triumph Plaza Hotel Laundry — Confidential</span>
              <span class="ep-footer__pages"></span>
            </footer>
          </td>
        </tr>
      </tfoot>
    </table>
  `;

  document.body.classList.add('ep-printing');

  const cleanup = () => {
    document.body.classList.remove('ep-printing');
    root.innerHTML = '';
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  // Allow layout/paint before invoking the native print dialog.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      try {
        window.print();
      } catch (error) {
        cleanup();
        throw error;
      }
      // Fallback cleanup if afterprint does not fire (some browsers).
      window.setTimeout(cleanup, 1500);
    });
  });
}

/** Build a printable HTML table from string rows (for catalog-style prints). */
export function buildPrintableTableHtml(options: {
  headers: string[];
  rows: string[][];
}): string {
  const head = options.headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join('');
  const body = options.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('');
  return `<table class="ep-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
