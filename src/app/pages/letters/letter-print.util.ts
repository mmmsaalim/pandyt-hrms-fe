import { HrLetter, LetterPrintPayload } from '../../core/services/letters.service';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBodyHtml(body: string): string {
  return escapeHtml(body).replace(/\n/g, '<br />');
}

export function applyLetterPlaceholders(
  text: string,
  options: {
    recipientName?: string | null;
    companyName: string;
    issueDate: string;
  },
): string {
  const recipient = options.recipientName?.trim() || '[Employee Name]';
  const replacements: Array<[RegExp, string]> = [
    [/\[Date\]|\[DD\/MM\/YYYY\]|\{\{date\}\}/gi, options.issueDate],
    [/\[Employee Name\]|\{\{employeeName\}\}/gi, recipient],
    [/\[Company Name\]|\{\{companyName\}\}/gi, options.companyName],
  ];

  return replacements.reduce(
    (result, [pattern, value]) => result.replace(pattern, value),
    text,
  );
}

export function buildLetterPrintHtml(payload: LetterPrintPayload): string {
  const { letter, letterhead } = payload;
  const meta = payload.printMeta ?? {
    referenceNo: `HR/${letter.id}/${new Date().getFullYear()}`,
    issueDate: new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    letterTypeLabel: letter.letterType,
    subject: letter.title,
  };

  const companyName = letterhead.companyDisplayName || 'Company';
  const resolvedBody = applyLetterPlaceholders(letter.body, {
    recipientName: letter.recipientName,
    companyName,
    issueDate: meta.issueDate,
  });
  const resolvedSubject = applyLetterPlaceholders(meta.subject, {
    recipientName: letter.recipientName,
    companyName,
    issueDate: meta.issueDate,
  });
  const resolvedTitle = escapeHtml(letter.title);
  const contactParts = [letterhead.address, letterhead.phone, letterhead.email].filter(Boolean);
  const contactLine = contactParts.map(escapeHtml).join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${resolvedTitle}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1f2937;
      font-family: "Times New Roman", Georgia, serif;
      font-size: 12pt;
      line-height: 1.55;
      background: #fff;
    }
    .letter-page {
      max-width: 780px;
      margin: 0 auto;
    }
    .letterhead {
      border-bottom: 2px solid #f47421;
      padding-bottom: 14px;
      margin-bottom: 22px;
    }
    .letterhead img {
      max-height: 56px;
      margin-bottom: 8px;
      display: block;
    }
    .letterhead h1 {
      margin: 0;
      font-size: 22pt;
      letter-spacing: 0.02em;
      color: #111827;
    }
    .letterhead .meta {
      margin-top: 6px;
      color: #6b7280;
      font-size: 10pt;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
      font-size: 10.5pt;
      color: #374151;
    }
    .meta-row strong {
      color: #111827;
      font-weight: 700;
    }
    .letter-title {
      margin: 0 0 8px;
      text-align: center;
      font-size: 14pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #111827;
    }
    .letter-subject {
      margin: 0 0 18px;
      font-weight: 700;
      color: #111827;
    }
    .letter-type {
      display: inline-block;
      margin-bottom: 12px;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      background: #fff4ea;
      color: #9a3412;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .letter-body {
      white-space: normal;
      text-align: justify;
    }
    .letter-footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 9pt;
      color: #6b7280;
      text-align: center;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="letter-page">
    <header class="letterhead">
      ${letterhead.logoUrl ? `<img src="${escapeHtml(letterhead.logoUrl)}" alt="Company logo" />` : ''}
      <h1>${escapeHtml(companyName)}</h1>
      ${contactLine ? `<div class="meta">${contactLine}</div>` : ''}
    </header>

    <div class="meta-row">
      <div><strong>Ref:</strong> ${escapeHtml(meta.referenceNo)}</div>
      <div><strong>Date:</strong> ${escapeHtml(meta.issueDate)}</div>
    </div>

    <div class="letter-type">${escapeHtml(meta.letterTypeLabel)}</div>
    <h2 class="letter-title">${resolvedTitle}</h2>
    <p class="letter-subject">Subject: ${escapeHtml(resolvedSubject)}</p>
    <div class="letter-body">${formatBodyHtml(resolvedBody)}</div>

    <footer class="letter-footer">
      This is a computer-generated official letter from ${escapeHtml(companyName)}.
    </footer>
  </div>
</body>
</html>`;
}
