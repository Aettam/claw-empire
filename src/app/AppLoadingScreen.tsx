import { I18nProvider } from "../i18n";

interface AppLoadingScreenProps {
  language: string;
  title: string;
  subtitle: string;
}

export default function AppLoadingScreen({ language, title, subtitle }: AppLoadingScreenProps) {
  return (
    <I18nProvider language={language}>
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--th-bg-primary)" }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-agent-bounce">🏢</div>
          <div className="font-medium" style={{ color: "var(--th-text-secondary)", fontSize: "var(--th-text-lg)", lineHeight: "var(--th-leading-lg)" }}>
            {title}
          </div>
          <div className="mt-1" style={{ color: "var(--th-text-muted)", fontSize: "var(--th-text-sm)", lineHeight: "var(--th-leading-sm)" }}>
            {subtitle}
          </div>
          <div className="mt-6 mx-auto w-48 h-1 rounded-full overflow-hidden" style={{ background: "var(--th-bg-surface)" }}>
            <div className="loading-bar-indeterminate h-full rounded-full" style={{ background: "var(--color-empire-green, #22c55e)" }} />
          </div>
        </div>
      </div>
    </I18nProvider>
  );
}
