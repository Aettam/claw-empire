import type { Agent, Department } from "../../types";
import { localeName } from "../../i18n";
import AgentAvatar from "../AgentAvatar";
import { ROLE_BADGE, ROLE_LABEL, STATUS_DOT } from "./constants";
import type { Translator } from "./types";

interface AgentCardProps {
  agent: Agent;
  spriteMap: Map<string, number>;
  isKo: boolean;
  locale: string;
  tr: Translator;
  departments: Department[];
  onEdit: () => void;
  confirmDeleteId: string | null;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  saving: boolean;
  staggerIndex?: number;
}

export default function AgentCard({
  agent,
  spriteMap,
  isKo,
  locale,
  tr,
  departments,
  onEdit,
  confirmDeleteId,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  saving,
  staggerIndex = 0,
}: AgentCardProps) {
  const isDeleting = confirmDeleteId === agent.id;
  const dept = departments.find((d) => d.id === agent.department_id);
  const staggerDelay = Math.min(staggerIndex * 50, 500);

  return (
    <div
      onClick={onEdit}
      className="group rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-black/10 focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: "var(--th-card-bg)",
        border: "1px solid var(--th-card-border)",
        animation: `list-enter var(--motion-duration-slow, 400ms) var(--motion-ease-bounce, cubic-bezier(0.34, 1.56, 0.64, 1)) both`,
        animationDelay: `${staggerDelay}ms`,
        transition: `transform var(--motion-duration-normal, 250ms) var(--motion-ease-default, ease),
                     box-shadow var(--motion-duration-normal, 250ms) var(--motion-ease-default, ease),
                     border-color var(--motion-duration-normal, 250ms) var(--motion-ease-default, ease)`,
        outlineColor: "var(--th-focus-ring)",
      }}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(); } }}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <AgentAvatar agent={agent} spriteMap={spriteMap} size={44} rounded="xl" showTooltip />
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${STATUS_DOT[agent.status] ?? STATUS_DOT.idle}`}
            style={{
              borderColor: "var(--th-card-bg)",
              transition: `background-color var(--motion-duration-normal, 250ms) var(--motion-ease-default, ease)`,
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate" style={{ color: "var(--th-text-heading)" }}>
              {localeName(locale, agent)}
            </span>
            <span className="text-[10px] shrink-0" style={{ color: "var(--th-text-muted)" }}>
              {(() => {
                const primary = localeName(locale, agent);
                const sub = locale === "en" ? agent.name_ko || "" : agent.name;
                return primary !== sub ? sub : "";
              })()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${ROLE_BADGE[agent.role] || ""}`}>
              {isKo ? ROLE_LABEL[agent.role]?.ko : ROLE_LABEL[agent.role]?.en}
            </span>
            {dept && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md"
                style={{ background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}
              >
                {dept.icon} {localeName(locale, dept)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between mt-3 pt-2.5"
        style={{ borderTop: "1px solid var(--th-card-border)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}
          >
            {agent.cli_provider}
          </span>
          {agent.personality && (
            <span
              className="text-[10px] truncate max-w-[120px]"
              style={{ color: "var(--th-text-muted)" }}
              title={agent.personality}
            >
              {agent.personality}
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ transitionDuration: "var(--motion-duration-fast, 150ms)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {isDeleting ? (
            <>
              <button
                onClick={onDeleteConfirm}
                disabled={saving || agent.status === "working"}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 transition-colors"
              >
                {tr("해고", "Fire")}
              </button>
              <button
                onClick={onDeleteCancel}
                className="px-2 py-0.5 rounded text-[10px] transition-colors"
                style={{ color: "var(--th-text-muted)" }}
              >
                {tr("취소", "No")}
              </button>
            </>
          ) : (
            <button
              onClick={onDeleteClick}
              className="px-1.5 py-0.5 rounded text-xs hover:bg-red-500/15 hover:text-red-400 transition-colors"
              style={{ color: "var(--th-text-muted)" }}
              title={tr("해고", "Fire")}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
