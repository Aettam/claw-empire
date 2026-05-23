import { memo, useId, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Agent } from "../types";

/** Map agent IDs to sprite numbers (stable order, same as OfficeView) */
export function buildSpriteMap(agents: Agent[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of agents) {
    if (a.sprite_number != null && a.sprite_number > 0) map.set(a.id, a.sprite_number);
  }
  const doro = agents.find((a) => a.name === "DORO");
  if (doro && !map.has(doro.id)) map.set(doro.id, 13);
  const rest = [...agents].filter((a) => !map.has(a.id)).sort((a, b) => a.id.localeCompare(b.id));
  rest.forEach((a, i) => map.set(a.id, (i % 12) + 1));
  return map;
}

/** Hook: memoized sprite map from agents array */
export function useSpriteMap(agents: Agent[]): Map<string, number> {
  return useMemo(() => buildSpriteMap(agents), [agents]);
}

/** Get the sprite number for an agent by ID */
export function getSpriteNum(agents: Agent[], agentId: string): number | undefined {
  return buildSpriteMap(agents).get(agentId);
}

function hashIdToSprite(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (hash % 12) + 1;
}

function resolveSpriteNum(agent: Agent | undefined, spriteMap: Map<string, number>): number | undefined {
  if (!agent) return undefined;
  if (agent.sprite_number != null && agent.sprite_number > 0) return agent.sprite_number;
  const mapped = spriteMap.get(agent.id);
  if (mapped != null && mapped > 0) return mapped;
  if (agent.name === "DORO") return 13;
  return hashIdToSprite(agent.id);
}

interface AgentAvatarProps {
  agent: Agent | undefined;
  agents?: Agent[];
  spriteMap?: Map<string, number>;
  size?: number;
  className?: string;
  rounded?: "full" | "xl" | "2xl";
  imageFit?: "cover" | "contain";
  imagePosition?: CSSProperties["objectPosition"];
  showTooltip?: boolean;
}

/** Sprite-based avatar — pass either `agents` or `spriteMap` */
function AgentAvatar({
  agent,
  agents,
  spriteMap,
  size = 28,
  className = "",
  rounded = "full",
  imageFit = "cover",
  imagePosition = "center",
  showTooltip = false,
}: AgentAvatarProps) {
  const map = spriteMap ?? (agents ? buildSpriteMap(agents) : new Map());
  const spriteNum = resolveSpriteNum(agent, map);
  const [hovered, setHovered] = useState(false);
  const tooltipId = useId();

  const roundedClass = rounded === "full" ? "rounded-full" : rounded === "xl" ? "rounded-xl" : "rounded-2xl";
  const tooltipName = agent?.name ?? "";
  const tooltipVisible = showTooltip && hovered && !!tooltipName;

  const wrapperProps = showTooltip
    ? {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        style: { position: "relative" as const },
        "aria-describedby": tooltipVisible ? tooltipId : undefined,
      }
    : {};

  const tooltip = tooltipVisible ? (
    <span
      id={tooltipId}
      role="tooltip"
      style={{
        position: "absolute",
        bottom: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "3px 8px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        background: "var(--th-bg-header, #0a0a18)",
        color: "var(--th-text-heading, #f1f5f9)",
        border: "1px solid var(--th-border, rgba(50,50,95,0.45))",
        boxShadow: "0 4px 12px var(--th-glass-shadow, rgba(0,0,0,0.5))",
        transition: `opacity var(--motion-duration-fast, 150ms) var(--motion-ease-default, ease)`,
        zIndex: 50,
      }}
    >
      {tooltipName}
    </span>
  ) : null;

  const lowPriority = spriteNum === 13 || spriteNum === 14;

  if (spriteNum) {
    return (
      <div {...wrapperProps}>
        <div
          className={`${roundedClass} overflow-hidden bg-gray-700 flex-shrink-0 ${className}`}
          style={{ width: size, height: size }}
        >
          <img
            src={`/sprites/${spriteNum}-D-1.png`}
            alt={agent?.name ?? ""}
            width={size}
            height={size}
            className={`w-full h-full ${imageFit === "contain" ? "object-contain" : "object-cover"}`}
            style={{ imageRendering: "pixelated", objectPosition: imagePosition }}
            fetchPriority={lowPriority ? "low" : undefined}
            loading={lowPriority ? "lazy" : undefined}
          />
        </div>
        {tooltip}
      </div>
    );
  }
  return (
    <div {...wrapperProps}>
      <div
        className={`${roundedClass} bg-gray-700 flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.6 }}
      >
        {agent?.avatar_emoji ?? "🤖"}
      </div>
      {tooltip}
    </div>
  );
}

export default memo(AgentAvatar);
