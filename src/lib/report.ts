import type { MatchResult, Professor, StudentProfile } from '../types';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatList(values: string[]) {
  return values.length > 0 ? values.map((value) => `<li>${escapeHtml(value)}</li>`).join('') : '<li>None listed</li>';
}

export function downloadProfessorReport({
  professor,
  match,
  studentProfile,
  isShortlisted,
}: {
  professor: Professor;
  match: MatchResult;
  studentProfile: StudentProfile;
  isShortlisted: boolean;
}) {
  const keywords = professor.publications.flatMap((publication) => publication.keywords).slice(0, 8);
  const methods = professor.publications.flatMap((publication) => publication.methods).slice(0, 8);
  const urls = Object.entries(professor.urls).filter(([, value]) => Boolean(value)) as Array<[string, string]>;
  const generatedAt = new Date().toLocaleString();

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>MentorFit Report - ${escapeHtml(professor.fullName)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f7fb;
        --card: #ffffff;
        --ink: #0f172a;
        --muted: #5b6475;
        --accent: #2563eb;
        --line: #dbe4f0;
        --success: #0f9f6f;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 40px;
        font-family: "Geist Variable", Arial, sans-serif;
        background: linear-gradient(180deg, #f7fbff 0%, var(--bg) 100%);
        color: var(--ink);
      }
      .report {
        max-width: 920px;
        margin: 0 auto;
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 28px;
        overflow: hidden;
        box-shadow: 0 20px 80px rgba(15, 23, 42, 0.08);
      }
      .hero {
        padding: 36px 40px 28px;
        background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.18), transparent 35%), #0f172a;
        color: white;
      }
      .hero h1 { margin: 12px 0 8px; font-size: 36px; line-height: 1.1; }
      .hero p { margin: 0; color: rgba(255,255,255,0.78); max-width: 700px; line-height: 1.6; }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        padding: 7px 12px;
        margin-right: 8px;
        margin-bottom: 8px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .content {
        padding: 32px 40px 40px;
        display: grid;
        gap: 20px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 22px;
        background: white;
      }
      h2 {
        margin: 0 0 12px;
        font-size: 13px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--muted);
      }
      h3 {
        margin: 0 0 10px;
        font-size: 20px;
      }
      p, li {
        font-size: 14px;
        line-height: 1.65;
        color: var(--ink);
      }
      ul {
        margin: 10px 0 0;
        padding-left: 18px;
      }
      .scores {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .score {
        border-radius: 18px;
        padding: 16px;
        background: #f8fbff;
        border: 1px solid var(--line);
      }
      .score strong {
        display: block;
        font-size: 26px;
        color: var(--accent);
        margin-bottom: 4px;
      }
      .score span {
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }
      .meta span {
        padding: 8px 12px;
        border-radius: 999px;
        background: #f8fbff;
        border: 1px solid var(--line);
        font-size: 12px;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 12px;
        color: var(--muted);
      }
      a { color: var(--accent); text-decoration: none; }
      @media print {
        body { background: white; padding: 0; }
        .report { box-shadow: none; border-radius: 0; }
      }
    </style>
  </head>
  <body>
    <article class="report">
      <section class="hero">
        <div class="pill">MentorFit Report</div>
        <div class="pill">${isShortlisted ? 'Shortlisted' : 'Not Shortlisted'}</div>
        <h1>${escapeHtml(professor.fullName)}</h1>
        <p>${escapeHtml(match.explanation)}</p>
        <div class="meta">
          <span>${escapeHtml([professor.institution, professor.department, professor.country].filter(Boolean).join(' • ') || 'Affiliation pending')}</span>
          <span>${escapeHtml(professor.profileOrigin === 'discovery' ? 'Academic discovery profile' : 'User-added profile')}</span>
          <span>${escapeHtml(professor.sourceType || 'Mixed sources')}</span>
          <span>Confidence ${Math.round(match.confidence * 100)}%</span>
        </div>
      </section>

      <section class="content">
        <div class="grid">
          <div class="card">
            <h2>Student Context</h2>
            <h3>${escapeHtml(studentProfile.name)} • ${escapeHtml(studentProfile.field)}</h3>
            <p>${escapeHtml(studentProfile.researchInterests)}</p>
            <ul>${formatList(studentProfile.methods)}</ul>
          </div>
          <div class="card">
            <h2>Source Snapshot</h2>
            <p>${escapeHtml(professor.sourceSummary || 'Profile assembled from public academic and profile-page sources.')}</p>
            <ul>${formatList(professor.highlights ?? [])}</ul>
          </div>
        </div>

        <div class="card">
          <h2>Score Breakdown</h2>
          <div class="scores">
            <div class="score"><strong>${match.overallScore}</strong><span>Overall Fit</span></div>
            <div class="score"><strong>${match.subscores.topic}</strong><span>Topic</span></div>
            <div class="score"><strong>${match.subscores.methods}</strong><span>Methods</span></div>
            <div class="score"><strong>${match.subscores.mentorship}</strong><span>Mentorship Signal</span></div>
            <div class="score"><strong>${match.subscores.trajectory}</strong><span>Trajectory</span></div>
            <div class="score"><strong>${match.subscores.activity}</strong><span>Activity</span></div>
            <div class="score"><strong>${match.subscores.network}</strong><span>Network</span></div>
            <div class="score"><strong>${match.subscores.careerAlignment}</strong><span>Career Alignment</span></div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h2>Research Signals</h2>
            <ul>${formatList(keywords)}</ul>
          </div>
          <div class="card">
            <h2>Method Signals</h2>
            <ul>${formatList(methods)}</ul>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h2>Profile URLs</h2>
            <ul>${urls.length > 0 ? urls.map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> <a href="${escapeHtml(value)}">${escapeHtml(value)}</a></li>`).join('') : '<li>No public URLs recorded.</li>'}</ul>
          </div>
          <div class="card">
            <h2>Limitations</h2>
            <p>${escapeHtml(match.limitation || 'No additional limitation was attached to this profile.')}</p>
          </div>
        </div>

        <div class="card">
          <h2>Recent Publications</h2>
          <ul>
            ${professor.publications.slice(0, 8).map((publication) => `
              <li>
                <strong>${escapeHtml(publication.title)}</strong>
                (${publication.year})${publication.venue ? ` • ${escapeHtml(publication.venue)}` : ''}
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="footer">
          <span>Generated ${escapeHtml(generatedAt)}</span>
          <span>MentorFit decision-support export</span>
        </div>
      </section>
    </article>
  </body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const slug = professor.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  anchor.href = url;
  anchor.download = `mentorfit-report-${slug || 'researcher'}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}
