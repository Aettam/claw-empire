import { useState, useEffect, useCallback } from "react";

const HERMES_PORT = 8900;
const POLL_INTERVAL_MS = 5000;

interface HermesHealth {
  ok: boolean;
  version?: string;
  memory_count?: number;
  skills_count?: number;
  sessions_active?: number;
}

interface SubAgent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  description: string;
  status: "idle" | "working" | "offline";
}

const TEW_AGENTS: SubAgent[] = [
  {
    id: "nova",
    name: "NOVA",
    role: "Fan Copy & Monetization",
    emoji: "💋",
    color: "#f43f5e",
    description:
      "Writes OnlyFans and ManyVids descriptions, fan DM templates, PPV captions, and subscription upsell scripts tailored to each model's voice.",
    status: "idle",
  },
  {
    id: "scarlett",
    name: "SCARLETT",
    role: "Content & Social Strategy",
    emoji: "📱",
    color: "#a855f7",
    description:
      "Plans content calendars, writes captions and hashtags, and maintains brand voice across Twitter/X, Reddit, TikTok, and all other platforms.",
    status: "idle",
  },
  {
    id: "cipher",
    name: "CIPHER",
    role: "Privacy & DMCA",
    emoji: "🔒",
    color: "#06b6d4",
    description:
      "Monitors for leaked content, drafts DMCA takedown notices, audits public profiles for PII exposure, and tracks piracy across the web.",
    status: "idle",
  },
];

type Tab = "overview" | "agents" | "memory" | "setup";

export default function HermesPanel() {
  const [health, setHealth] = useState<HermesHealth | null>(null);
  const [online, setOnline] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [hermesPort, setHermesPort] = useState(HERMES_PORT);
  const [portInput, setPortInput] = useState(String(HERMES_PORT));

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${hermesPort}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = (await res.json()) as HermesHealth;
        setHealth(data);
        setOnline(true);
      } else {
        setOnline(false);
        setHealth(null);
      }
    } catch {
      setOnline(false);
      setHealth(null);
    } finally {
      setChecking(false);
    }
  }, [hermesPort]);

  useEffect(() => {
    setChecking(true);
    void checkHealth();
    const id = setInterval(() => void checkHealth(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [checkHealth]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "👑" },
    { id: "agents", label: "TEW Agents", icon: "💼" },
    { id: "memory", label: "Memory", icon: "🧠" },
    { id: "setup", label: "Setup Guide", icon: "🛠️" },
  ];

  return (
    <div className="space-y-4">
      {/* Header status bar */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl">👑</div>
          <div>
            <div className="font-bold text-lg" style={{ color: "var(--th-text-heading)" }}>
              TEW Hub
            </div>
            <div className="text-xs" style={{ color: "var(--th-text-muted)" }}>
              The Elder Wives · Agency Intelligence · Port {hermesPort}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {checking ? (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>Checking...</span>
            </div>
          ) : online ? (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Online</span>
              {health?.version && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--th-bg-surface-hover)", color: "var(--th-text-muted)" }}
                >
                  v{health.version}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-red-400 font-medium">Offline</span>
            </div>
          )}

          <button
            onClick={() => { setChecking(true); void checkHealth(); }}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: "var(--th-bg-surface-hover)",
              color: "var(--th-text-secondary)",
              border: "1px solid var(--th-border)",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats row — shown when online */}
      {online && health && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Memory Entries", value: health.memory_count ?? "—", icon: "🧠" },
            { label: "Skills Loaded", value: health.skills_count ?? "—", icon: "📚" },
            { label: "Active Sessions", value: health.sessions_active ?? "—", icon: "💬" },
          ].map((stat, statIdx) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 text-center"
              style={{
                background: "var(--th-bg-surface)",
                border: "1px solid var(--th-border)",
                animation: `list-enter var(--motion-duration-slow, 400ms) var(--motion-ease-bounce, cubic-bezier(0.34, 1.56, 0.64, 1)) both`,
                animationDelay: `${statIdx * 80}ms`,
              }}
            >
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-xl font-bold" style={{ color: "var(--th-text-heading)" }}>{stat.value}</div>
              <div className="text-xs" style={{ color: "var(--th-text-muted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Offline callout */}
      {!online && !checking && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
          }}
        >
          <div className="text-2xl shrink-0">🔌</div>
          <div>
            <div className="font-semibold text-sm text-red-400">TEW Hub is not running</div>
            <div className="text-xs mt-1" style={{ color: "var(--th-text-muted)" }}>
              No connection on port {hermesPort}. Go to the{" "}
              <button
                className="underline text-blue-400 hover:text-blue-300"
                onClick={() => setActiveTab("setup")}
              >
                Setup Guide
              </button>{" "}
              tab to get it running, or update the port below if it is on a different port.
            </div>
            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                className="w-24 px-2 py-1 rounded-md text-xs"
                style={{
                  background: "var(--th-bg-surface)",
                  border: "1px solid var(--th-border)",
                  color: "var(--th-text-heading)",
                }}
                placeholder="Port"
              />
              <button
                onClick={() => {
                  const p = parseInt(portInput, 10);
                  if (!isNaN(p) && p > 0) { setHermesPort(p); }
                }}
                className="text-xs px-3 py-1 rounded-md transition-colors"
                style={{
                  background: "var(--th-bg-surface-hover)",
                  color: "var(--th-text-secondary)",
                  border: "1px solid var(--th-border)",
                }}
              >
                Try port
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
      >
        <div
          className="flex border-b"
          style={{ borderColor: "var(--th-border)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === tab.id ? "border-b-2 border-rose-500" : ""
              }`}
              style={{
                color: activeTab === tab.id ? "#f43f5e" : "var(--th-text-muted)",
                background: activeTab === tab.id ? "rgba(244,63,94,0.05)" : "transparent",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
                What is TEW Hub?
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                TEW Hub is a persistent AI assistant built specifically for The Elder Wives agency. Unlike the standard
                Claw Empire agents, TEW Hub remembers your models, their platform performance, fan behavior patterns,
                and brand voice — and builds new skills from every task it completes, so it gets smarter the more you
                use it.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { icon: "🧠", title: "Persistent Memory", desc: "Remembers model profiles, fan data, and platform strategies across all sessions" },
                  { icon: "📚", title: "Self-Written Skills", desc: "Learns new platform rules and content strategies and saves them as reusable skills" },
                  { icon: "💼", title: "Agency-Focused Agents", desc: "NOVA, SCARLETT, and CIPHER handle copy, content, and privacy for your roster" },
                  { icon: "🔒", title: "Privacy-First", desc: "All data stays local on your machine — nothing sent to third parties" },
                ].map((feat) => (
                  <div
                    key={feat.title}
                    className="rounded-lg p-3"
                    style={{ background: "var(--th-bg-surface-hover)", border: "1px solid var(--th-border)" }}
                  >
                    <div className="text-xl mb-1">{feat.icon}</div>
                    <div className="text-xs font-semibold" style={{ color: "var(--th-text-heading)" }}>{feat.title}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--th-text-muted)" }}>{feat.desc}</div>
                  </div>
                ))}
              </div>

              <div
                className="rounded-lg p-3 mt-2"
                style={{ background: "rgba(244,63,94,0.07)", border: "1px solid rgba(244,63,94,0.2)" }}
              >
                <div className="text-xs font-semibold text-rose-400 mb-1">Powered by</div>
                <div className="text-[11px]" style={{ color: "var(--th-text-secondary)" }}>
                  DeepSeek AI · Runs fully local · Integrates with Claw Empire agent office
                </div>
              </div>
            </div>
          )}

          {/* AGENTS TAB */}
          {activeTab === "agents" && (
            <div className="space-y-3">
              <div className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
                TEW Agency Agents
              </div>
              <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
                These three specialists live inside TEW Hub and handle tasks routed from Claw Empire.
              </p>
              {TEW_AGENTS.map((agent, agentIdx) => (
                <div
                  key={agent.id}
                  className="rounded-xl p-4 flex items-start gap-4"
                  style={{
                    background: "var(--th-bg-surface-hover)",
                    border: "1px solid var(--th-border)",
                    animation: `list-enter var(--motion-duration-slow, 400ms) var(--motion-ease-out, cubic-bezier(0, 0, 0.2, 1)) both`,
                    animationDelay: `${agentIdx * 80}ms`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: `${agent.color}18`, border: `1px solid ${agent.color}40` }}
                  >
                    {agent.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold" style={{ color: "var(--th-text-heading)" }}>{agent.name}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${agent.color}20`, color: agent.color }}
                      >
                        {agent.role}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full ml-auto"
                        style={{
                          background: online ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)",
                          color: online ? "#10b981" : "#6b7280",
                        }}
                      >
                        {online ? "Ready" : "Hub Offline"}
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--th-text-secondary)" }}>
                      {agent.description}
                    </div>
                  </div>
                </div>
              ))}
              <div
                className="rounded-lg p-3 text-xs"
                style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "var(--th-text-muted)" }}
              >
                CIPHER (Privacy &amp; DMCA) runs continuous background scans once TEW Hub is online. Start the hub to activate all three agents.
              </div>
            </div>
          )}

          {/* MEMORY TAB */}
          {activeTab === "memory" && (
            <div className="space-y-3">
              <div className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
                Agency Memory
              </div>
              {online ? (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
                    Memory entries are stored locally in the TEW Hub workspace. Open the hub dashboard at{" "}
                    <span className="font-mono text-rose-400">http://127.0.0.1:{hermesPort}</span> to browse and edit
                    them directly.
                  </p>
                  <div
                    className="rounded-lg p-3"
                    style={{ background: "var(--th-bg-surface-hover)", border: "1px solid var(--th-border)" }}
                  >
                    <div className="text-xs font-semibold mb-2" style={{ color: "var(--th-text-heading)" }}>
                      Memory files location
                    </div>
                    <div className="font-mono text-[11px]" style={{ color: "var(--th-text-secondary)" }}>
                      ~/.tew-hub/workspace/memory/
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs" style={{ color: "var(--th-text-muted)" }}>
                  Start TEW Hub to view memory entries. See the{" "}
                  <button
                    className="underline text-rose-400"
                    onClick={() => setActiveTab("setup")}
                  >
                    Setup Guide
                  </button>{" "}
                  to get started.
                </div>
              )}
            </div>
          )}

          {/* SETUP TAB */}
          {activeTab === "setup" && (
            <div className="space-y-4">
              <div className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
                Windows Setup Guide
              </div>
              <div
                className="rounded-lg p-3 text-xs"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
              >
                TEW Hub requires WSL2 (Windows Subsystem for Linux). Follow the steps below — this is a one-time setup
                that takes about 10 minutes.
              </div>

              {[
                {
                  step: 1,
                  title: "Install WSL2",
                  detail: "Open PowerShell as Administrator and run:",
                  code: "wsl --install",
                  note: "Restart your computer when prompted. This installs Ubuntu automatically.",
                },
                {
                  step: 2,
                  title: "Open Ubuntu",
                  detail: "After restart, open 'Ubuntu' from the Start menu and create a username and password.",
                  code: null,
                  note: null,
                },
                {
                  step: 3,
                  title: "Install TEW Hub",
                  detail: "Inside the Ubuntu terminal, run the one-line installer:",
                  code: "curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash",
                  note: "This installs Python, uv, and the hub backend automatically.",
                },
                {
                  step: 4,
                  title: "Add your DeepSeek API key",
                  detail: "Configure the hub with your DeepSeek API key:",
                  code: "hermes config set DEEPSEEK_API_KEY sk-b5c76296c43b4c8cab1a481774861676",
                  note: "This is the same key already powering your Claw Empire agents.",
                },
                {
                  step: 5,
                  title: "Start the hub",
                  detail: "Start the gateway so Claw Empire can connect:",
                  code: `hermes gateway --port ${HERMES_PORT}`,
                  note: "Leave this terminal open. This panel will turn green automatically.",
                },
              ].map(({ step, title, detail, code, note }) => (
                <div
                  key={step}
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--th-bg-surface-hover)",
                    border: "1px solid var(--th-border)",
                    animation: `list-enter var(--motion-duration-slow, 400ms) var(--motion-ease-out, cubic-bezier(0, 0, 0.2, 1)) both`,
                    animationDelay: `${(step - 1) * 60}ms`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: "rgba(244,63,94,0.15)", color: "#f43f5e" }}
                    >
                      {step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold mb-1" style={{ color: "var(--th-text-heading)" }}>
                        {title}
                      </div>
                      <div className="text-xs mb-2" style={{ color: "var(--th-text-secondary)" }}>
                        {detail}
                      </div>
                      {code && (
                        <div
                          className="rounded-lg p-2.5 font-mono text-[11px] break-all"
                          style={{
                            background: "rgba(0,0,0,0.3)",
                            color: "#a3e635",
                            border: "1px solid rgba(163,230,53,0.15)",
                          }}
                        >
                          {code}
                        </div>
                      )}
                      {note && (
                        <div className="text-[11px] mt-2" style={{ color: "var(--th-text-muted)" }}>
                          {note}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div
                className="rounded-lg p-3 text-xs"
                style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "#fda4af" }}
              >
                Once TEW Hub is running, come back to this panel — the status indicator will turn green and NOVA,
                SCARLETT, and CIPHER will show as Ready.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
