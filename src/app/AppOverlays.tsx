import { lazy, Suspense, type ReactNode } from "react";
import type { TaskReportDetail } from "../api";

// ── Overlay-level lazy chunks ────────────────────────────────────────────────
// Overlays are only shown on demand, so we defer their code & deps.
const ChatPanel         = lazy(() => import("../components/ChatPanel").then(m => ({ default: m.ChatPanel })));
const DecisionInboxModal = lazy(() => import("../components/DecisionInboxModal"));
const AgentDetail       = lazy(() => import("../components/AgentDetail"));
const TerminalPanel     = lazy(() => import("../components/TerminalPanel"));
const TaskReportPopup   = lazy(() => import("../components/TaskReportPopup"));
const ReportHistory     = lazy(() => import("../components/ReportHistory"));
const AgentStatusPanel  = lazy(() => import("../components/AgentStatusPanel"));
const OfficeRoomManager = lazy(() => import("../components/OfficeRoomManager"));
// ─────────────────────────────────────────────────────────────────────────────

const OverlaySuspense = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={null}>{children}</Suspense>
);
import type { DecisionInboxItem } from "../components/chat/decision-inbox";
import type { Agent, Department, Message, RoomTheme, SubAgent, SubTask, Task, WorkflowPackKey } from "../types";
import type { UiLanguage } from "../i18n";
import type { ProjectMetaPayload, RoomThemeMap, TaskPanelTab } from "./types";

interface AppOverlaysProps {
  showChat: boolean;
  chatAgent: Agent | null;
  messages: Message[];
  agents: Agent[];
  streamingMessage: {
    message_id: string;
    agent_id: string;
    agent_name: string;
    agent_avatar: string;
    content: string;
  } | null;
  onSendMessage: (
    content: string,
    receiverType: "agent" | "department" | "all",
    receiverId?: string,
    messageType?: string,
    projectMeta?: ProjectMetaPayload,
  ) => Promise<void>;
  onSendAnnouncement: (content: string) => Promise<void>;
  onSendDirective: (content: string, projectMeta?: ProjectMetaPayload) => Promise<void>;
  onClearMessages: (agentId?: string) => Promise<void>;
  onCloseChat: () => void;
  showDecisionInbox: boolean;
  decisionInboxLoading: boolean;
  decisionInboxItems: DecisionInboxItem[];
  decisionReplyBusyKey: string | null;
  uiLanguage: UiLanguage;
  onCloseDecisionInbox: () => void;
  onRefreshDecisionInbox: () => void;
  onReplyDecisionOption: (
    item: DecisionInboxItem,
    optionNumber: number,
    payloadInput?: { note?: string; selected_option_numbers?: number[] },
  ) => Promise<void>;
  onOpenDecisionChat: (agentId: string) => void;
  selectedAgent: Agent | null;
  activeOfficeWorkflowPack: WorkflowPackKey;
  departments: Department[];
  tasks: Task[];
  subAgents: SubAgent[];
  subtasks: SubTask[];
  onCloseSelectedAgent: () => void;
  onChatFromAgentDetail: (agent: Agent) => void;
  onAssignTaskFromAgentDetail: () => void;
  onOpenTerminalFromAgentDetail: (taskId: string) => void;
  onAgentUpdated: () => void;
  taskPanel: { taskId: string; tab: TaskPanelTab } | null;
  onCloseTaskPanel: () => void;
  taskReport: TaskReportDetail | null;
  onCloseTaskReport: () => void;
  showReportHistory: boolean;
  onCloseReportHistory: () => void;
  showAgentStatus: boolean;
  onCloseAgentStatus: () => void;
  showRoomManager: boolean;
  roomManagerDepartments: { id: string; name: string }[];
  customRoomThemes: RoomThemeMap;
  onActiveRoomThemeTargetIdChange: (departmentId: string | null) => void;
  onRoomThemeChange: (themes: Record<string, RoomTheme>) => void;
  onCloseRoomManager: () => void;
}

export default function AppOverlays({
  showChat,
  chatAgent,
  messages,
  agents,
  streamingMessage,
  onSendMessage,
  onSendAnnouncement,
  onSendDirective,
  onClearMessages,
  onCloseChat,
  showDecisionInbox,
  decisionInboxLoading,
  decisionInboxItems,
  decisionReplyBusyKey,
  uiLanguage,
  onCloseDecisionInbox,
  onRefreshDecisionInbox,
  onReplyDecisionOption,
  onOpenDecisionChat,
  selectedAgent,
  activeOfficeWorkflowPack,
  departments,
  tasks,
  subAgents,
  subtasks,
  onCloseSelectedAgent,
  onChatFromAgentDetail,
  onAssignTaskFromAgentDetail,
  onOpenTerminalFromAgentDetail,
  onAgentUpdated,
  taskPanel,
  onCloseTaskPanel,
  taskReport,
  onCloseTaskReport,
  showReportHistory,
  onCloseReportHistory,
  showAgentStatus,
  onCloseAgentStatus,
  showRoomManager,
  roomManagerDepartments,
  customRoomThemes,
  onActiveRoomThemeTargetIdChange,
  onRoomThemeChange,
  onCloseRoomManager,
}: AppOverlaysProps) {
  return (
    <>
      {showChat && (
        <OverlaySuspense>
          <ChatPanel
            selectedAgent={chatAgent}
            messages={messages}
            agents={agents}
            streamingMessage={streamingMessage}
            onSendMessage={onSendMessage}
            onSendAnnouncement={onSendAnnouncement}
            onSendDirective={onSendDirective}
            onClearMessages={onClearMessages}
            onClose={onCloseChat}
          />
        </OverlaySuspense>
      )}

      {showDecisionInbox && (
        <OverlaySuspense>
          <DecisionInboxModal
            open={showDecisionInbox}
            loading={decisionInboxLoading}
            items={decisionInboxItems}
            agents={agents}
            busyKey={decisionReplyBusyKey}
            uiLanguage={uiLanguage}
            onClose={onCloseDecisionInbox}
            onRefresh={onRefreshDecisionInbox}
            onReplyOption={onReplyDecisionOption}
            onOpenChat={onOpenDecisionChat}
          />
        </OverlaySuspense>
      )}

      {selectedAgent && (
        <OverlaySuspense>
          <AgentDetail
            agent={selectedAgent}
            agents={agents}
            department={departments.find((d) => d.id === selectedAgent.department_id)}
            departments={departments}
            tasks={tasks}
            subAgents={subAgents}
            subtasks={subtasks}
            onClose={onCloseSelectedAgent}
            onChat={onChatFromAgentDetail}
            onAssignTask={onAssignTaskFromAgentDetail}
            onOpenTerminal={onOpenTerminalFromAgentDetail}
            onAgentUpdated={onAgentUpdated}
            activeOfficeWorkflowPack={activeOfficeWorkflowPack}
          />
        </OverlaySuspense>
      )}

      {taskPanel && (
        <OverlaySuspense>
          <TerminalPanel
            taskId={taskPanel.taskId}
            initialTab={taskPanel.tab}
            task={tasks.find((t) => t.id === taskPanel.taskId)}
            agent={agents.find(
              (a) =>
                a.current_task_id === taskPanel.taskId ||
                tasks.find((t) => t.id === taskPanel.taskId)?.assigned_agent_id === a.id,
            )}
            agents={agents}
            onClose={onCloseTaskPanel}
          />
        </OverlaySuspense>
      )}

      {taskReport && (
        <OverlaySuspense>
          <TaskReportPopup
            report={taskReport}
            agents={agents}
            departments={departments}
            uiLanguage={uiLanguage}
            onClose={onCloseTaskReport}
          />
        </OverlaySuspense>
      )}

      {showReportHistory && (
        <OverlaySuspense>
          <ReportHistory
            agents={agents}
            departments={departments}
            uiLanguage={uiLanguage}
            onClose={onCloseReportHistory}
          />
        </OverlaySuspense>
      )}

      {showAgentStatus && (
        <OverlaySuspense>
          <AgentStatusPanel agents={agents} uiLanguage={uiLanguage} onClose={onCloseAgentStatus} />
        </OverlaySuspense>
      )}

      {showRoomManager && (
        <OverlaySuspense>
          <OfficeRoomManager
            departments={roomManagerDepartments}
            customThemes={customRoomThemes}
            onActiveDeptChange={onActiveRoomThemeTargetIdChange}
            onThemeChange={onRoomThemeChange}
            onClose={onCloseRoomManager}
            language={uiLanguage}
          />
        </OverlaySuspense>
      )}
    </>
  );
}
