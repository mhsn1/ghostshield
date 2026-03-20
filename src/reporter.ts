import type { ScanResult, ProbeResult } from "./types.js";

export function generateHTML(result: ScanResult): string {
  const vulnFindings = result.findings.filter(f => f.vulnerable);
  const scoreColor = result.score >= 90 ? "#22c55e" : result.score >= 70 ? "#f59e0b" : result.score >= 50 ? "#ef4444" : "#7c3aed";

  const categoryStats = result.findings.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = { total: 0, vulnerable: 0 };
    acc[f.category].total++;
    if (f.vulnerable) acc[f.category].vulnerable++;
    return acc;
  }, {} as Record<string, { total: number; vulnerable: number }>);

  const findingsHTML = vulnFindings.map(f => {
    const color = f.severity === "critical" ? "#7c3aed" : f.severity === "high" ? "#ef4444" : f.severity === "medium" ? "#f59e0b" : "#22c55e";
    return `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin-bottom:12px;border-left:4px solid ${color}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
        <span style="font-family:monospace;font-size:13px;background:#21262d;padding:2px 8px;border-radius:4px;color:#f97316">${f.probe}</span>
        <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;background:${color}22;color:${color};border:1px solid ${color}44">${f.severity}</span>
        <span style="font-size:12px;color:#8b949e;background:#21262d;padding:2px 8px;border-radius:4px">${f.category}</span>
      </div>
      <div style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:12px;margin-bottom:12px">
        <div style="font-size:11px;color:#f97316;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">ATTACK</div>
        <div style="font-family:monospace;font-size:12px;color:#8b949e;white-space:pre-wrap;word-break:break-word">${f.attack.slice(0,200)}${f.attack.length > 200 ? '...' : ''}</div>
      </div>
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:12px;max-height:100px;overflow:hidden">
        <div style="font-size:11px;color:#ef4444;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">LEAKED RESPONSE</div>
        <div style="font-family:monospace;font-size:12px;color:#f0883e;white-space:pre-wrap;word-break:break-word">${f.response.slice(0,250)}${f.response.length > 250 ? '...' : ''}</div>
      </div>
      <div style="font-size:13px;color:#8b949e;font-style:italic">🔍 ${f.reasoning}</div>
    </div>`;
  }).join('');

  const categoryHTML = Object.entries(categoryStats).map(([cat, stats]) => {
    const pct = Math.round((stats.vulnerable / stats.total) * 100);
    const barColor = pct > 60 ? "#ef4444" : pct > 30 ? "#f59e0b" : "#22c55e";
    return `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#f97316;margin-bottom:8px">${cat}</div>
      <div style="background:#21262d;border-radius:4px;height:6px;margin-bottom:8px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px"></div>
      </div>
      <div style="font-size:12px;color:#8b949e">${stats.vulnerable}/${stats.total} vulnerable (${pct}%)</div>
    </div>`;
  }).join('');

  const recsHTML = result.recommendations.map(r => `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:8px;display:flex;gap:12px;align-items:flex-start;border-left:3px solid #f97316">
      <span style="font-size:16px">💡</span>
      <div style="font-size:14px;color:#e6edf3;font-family:monospace">${r}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GhostShield Security Report — ${result.target}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#0d1117; color:#e6edf3; line-height:1.6; }
  @media print { body { background: white; color: black; } }
</style>
</head>
<body>

<!-- HEADER -->
<div style="background:linear-gradient(135deg,#1a0a2e 0%,#16213e 50%,#1a0a2e 100%);padding:48px 40px;border-bottom:2px solid #f97316">
  <div style="max-width:1100px;margin:0 auto">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
      <span style="font-size:36px">👻</span>
      <div>
        <div style="font-size:28px;font-weight:800;color:#f97316;letter-spacing:-1px">GhostShield</div>
        <div style="font-size:13px;color:#8b949e">AI-Powered LLM Security Scanner — Real attacks. Zero dummy data.</div>
      </div>
    </div>
    <div style="height:1px;background:#30363d;margin:24px 0"></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px">
      <div style="background:rgba(255,255,255,0.05);border:1px solid #30363d;border-radius:8px;padding:16px">
        <div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Model</div>
        <div style="font-size:16px;font-weight:700;color:#f97316">${result.target}</div>
      </div>
      <div style="background:rgba(255,255,255,0.05);border:1px solid #30363d;border-radius:8px;padding:16px">
        <div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Score</div>
        <div style="font-size:28px;font-weight:800;color:${scoreColor}">${result.score}<span style="font-size:14px;color:#8b949e">/100</span></div>
      </div>
      <div style="background:rgba(255,255,255,0.05);border:1px solid #30363d;border-radius:8px;padding:16px">
        <div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Vulnerabilities</div>
        <div style="font-size:28px;font-weight:800;color:#ef4444">${result.vulnerabilities}<span style="font-size:14px;color:#8b949e">/${result.totalProbes}</span></div>
      </div>
      <div style="background:rgba(255,255,255,0.05);border:1px solid #30363d;border-radius:8px;padding:16px">
        <div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Severity</div>
        <div style="font-size:20px;font-weight:800;color:${scoreColor};text-transform:uppercase">${result.severity}</div>
      </div>
      <div style="background:rgba(255,255,255,0.05);border:1px solid #30363d;border-radius:8px;padding:16px">
        <div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Timestamp</div>
        <div style="font-size:13px;font-weight:600;color:#e6edf3">${new Date(result.timestamp).toLocaleString()}</div>
      </div>
    </div>
  </div>
</div>

<!-- BODY -->
<div style="max-width:1100px;margin:0 auto;padding:40px">

  <!-- CATEGORY BREAKDOWN -->
  <div style="margin-bottom:40px">
    <div style="font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #21262d">
      📊 Attack Category Breakdown
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
      ${categoryHTML}
    </div>
  </div>

  <!-- VULNERABILITIES -->
  <div style="margin-bottom:40px">
    <div style="font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #21262d">
      ⚠️ Vulnerabilities Found (${vulnFindings.length})
    </div>
    ${findingsHTML.length > 0 ? findingsHTML : '<div style="color:#22c55e;padding:20px;background:#161b22;border-radius:8px;border:1px solid #1f4423">✅ No vulnerabilities detected — system prompt is well hardened.</div>'}
  </div>

  <!-- RECOMMENDATIONS -->
  <div style="margin-bottom:40px">
    <div style="font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #21262d">
      💡 Remediation Recommendations
    </div>
    ${recsHTML}
  </div>

</div>

<!-- FOOTER -->
<div style="text-align:center;padding:40px;color:#8b949e;font-size:13px;border-top:1px solid #21262d">
  Generated by <span style="color:#f97316;font-weight:700">GhostShield</span> — github.com/mhsn1/ghostshield
  &nbsp;·&nbsp; ${new Date(result.timestamp).toLocaleString()}
</div>

</body>
</html>`;
}
