export interface ScanTarget {
  systemPrompt: string;
  model: string;
  apiKey: string;
  provider: "groq" | "openrouter";
}

export interface ProbeResult {
  probe: string;
  category: string;
  attack: string;
  response: string;
  vulnerable: boolean;
  severity: "none" | "low" | "medium" | "high" | "critical";
  reasoning: string;
  leakScore?: number;  // 0-1 mathematical leak confidence
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  vulnerable: number;
  riskScore: number;  // 0-1
}

export interface ScanResult {
  target: string;
  timestamp: string;
  totalProbes: number;
  vulnerabilities: number;
  score: number;
  severity: "secure" | "low" | "medium" | "high" | "critical";
  findings: ProbeResult[];
  recommendations: string[];
  categoryBreakdown?: CategoryBreakdown[];
  leakAnalysis?: {
    maxLeakScore: number;
    avgLeakScore: number;
    leaksDetected: number;
  };
}
