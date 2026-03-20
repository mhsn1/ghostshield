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
}
