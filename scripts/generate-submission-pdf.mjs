/**
 * PDF generation for course submission.
 *
 * Default (recommended upload): docs/COURSE-SUBMISSION-REPORT.pdf
 *   npm run pdf:submission
 *
 * Full documentation appendix (~100+ pages):
 *   npm run pdf:submission-bundle
 *
 * Requires Google Chrome (channel: chrome). Or: npx playwright install
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const readinessPath = path.join(root, 'docs', 'SUBMISSION-COURSE-SEQUENCE-READINESS.md');
const bundlePath = path.join(root, 'docs', 'SUBMISSION-BUNDLE.md');

const fullBundle = process.argv.includes('--bundle') || process.env.SUBMISSION_PDF_FULL === '1';

const mdPath = fullBundle ? bundlePath : path.join(root, 'docs', 'COURSE-SUBMISSION-REPORT.md');
const outPdf = fullBundle
	? path.join(root, 'docs', 'Nucamp-SoloAI-Submission-Bundle.pdf')
	: path.join(root, 'docs', 'COURSE-SUBMISSION-REPORT.pdf');

let md = fs.readFileSync(mdPath, 'utf8');
if (fullBundle && fs.existsSync(readinessPath)) {
	md =
		fs.readFileSync(readinessPath, 'utf8') +
		'\n\n---\n\n# Appendix — Full documentation bundle\n\n' +
		md;
}

const bodyHtml = await marked.parse(md, { gfm: true });

const docTitle = fullBundle ? 'Nucamp Solo AI — Full docs bundle' : 'Nucamp Solo AI — Course submission';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11pt; line-height: 1.45; color: #111; margin: 0; padding: 12mm 14mm; }
    h1 { font-size: 18pt; margin-top: 0; page-break-after: avoid; }
    h2 { font-size: 13pt; margin-top: 1.2em; page-break-after: avoid; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; }
    h3 { font-size: 11pt; page-break-after: avoid; }
    pre, code { font-family: ui-monospace, monospace; font-size: 9pt; }
    pre { white-space: pre-wrap; word-break: break-word; background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
    code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; }
    hr { border: none; border-top: 1px solid #cbd5e1; margin: 1.5em 0; }
    ul, ol { padding-left: 1.4em; }
    blockquote { margin: 0.8em 0; padding: 0.5em 1em; border-left: 4px solid #cbd5e1; background: #f8fafc; font-size: 10pt; }
    a { color: #1d4ed8; text-decoration: none; }
    table { border-collapse: collapse; width: 100%; font-size: 10pt; margin: 0.8em 0; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; }
    @media print {
      pre { page-break-inside: avoid; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

const browser = await chromium.launch({
	headless: true,
	channel: process.env.PW_CHANNEL || 'chrome'
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'domcontentloaded' });
await page.pdf({
	path: outPdf,
	format: 'Letter',
	margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
	printBackground: true
});
await browser.close();

console.log('Wrote', outPdf, fullBundle ? '(full bundle)' : '(course submission only)');
