"use client";
import { linearStatusLabels } from "@/lib/linear-followups";
import { WorkspaceAdmin } from "./workspace-admin";
import { can, type Access } from "@/lib/access";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  CircleCheck,
  Clock3,
  Code2,
  Copy,
  Play,
  FileText,
  GitBranch,
  Hash,
  Layers3,
  Link2,
  ListTodo,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import {
  adrMarkdown,
  botStopRetryMs,
  evidenceUrl,
  meetingPreview,
  summaryMarkdown,
  time,
  type Meeting,
  type MeetingPreview,
  type Segment,
  type Decision,
  type Action,
  type Delivery,
  type Destination,
  type IntegrationStatus,
  type MeetStreamBot,
  type MeetStreamBotStatus,
} from "@/lib/types";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  defaultPreferences,
  meetingSorts,
  type Preferences,
} from "@/lib/preferences";
import {
  workspaceRoute,
  meetingPath,
  type WorkspaceView,
} from "@/lib/navigation";
import { sortMeetings, sortOutputs } from "@/lib/sorting";
import { PreferencesPage } from "./preferences-pages";
import { IntegrationsPage } from "./integrations-page";
import { requestJson } from "@/lib/client";
import type { IntegrationStates } from "@/lib/integration-catalog";
import type { Correction } from "@/lib/review-corrections";

type View = WorkspaceView;
type ModalState =
  | { type: "import"; source?: "paste" | "meetstream" }
  | { type: "editDecision"; meeting: Meeting; item: Decision }
  | { type: "editAction"; meeting: Meeting; item: Action }
  | { type: "correctTurn"; meeting: Meeting; turn: Segment }
  | { type: "mergeDraft"; meeting: Meeting; item: Decision | Action }
  | { type: "adr"; meeting: Meeting; item: Decision }
  | { type: "publish"; meeting: Meeting; itemIds?: string[] }
  | { type: "removeProject"; name: string }
  | { type: "help" }
  | null;
const emptyStatus: IntegrationStatus = {
  jira: false,
  trello: false,
  linear: false,
  github: false,
  slack: false,
  webhook: false,
  notion: false,
  meetstream: false,
  ai: false,
};
const names: Record<Destination, string> = {
  jira: "Jira",
  trello: "Trello",
  linear: "Linear",
  github: "GitHub",
  slack: "Slack",
  webhook: "Signed webhook",
  notion: "Notion",
};
function Github({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.08c-3.13.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 .1 1.63 2.02 3.28 1.45.1-.72.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.55 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.31-2.63 5.26-5.14 5.54.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z" />
    </svg>
  );
}
function Avatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "xs" | "md";
}) {
  const colors = ["lavender", "peach", "mint", "blue"];
  const color =
    colors[Array.from(name).reduce((n, c) => n + c.charCodeAt(0), 0) % 4];
  return (
    <span title={name} className={`avatar ${size} ${color}`}>
      {name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
function AppIcon({ id }: { id: string }) {
  return (
    <span className={`app-icon ${id}`}>
      {id === "github" ? (
        <Github size={22} />
      ) : id === "slack" ? (
        <Hash size={25} />
      ) : id === "jira" || id === "trello" ? (
        <ListTodo size={22} />
      ) : id === "notion" ? (
        <b>N</b>
      ) : id === "webhook" ? (
        <Link2 size={22} />
      ) : id === "meetstream" ? (
        <AudioLines size={23} />
      ) : id === "ai" ? (
        <span>✳</span>
      ) : (
        <span>◒</span>
      )}
    </span>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby="modal-title"
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button
          aria-label="Close dialog"
          className="icon-button"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString().slice(0, 10);
}
function dateLabel(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function download(name: string, text: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
type ApiResponse = {
  access: Access;
  meetings: MeetingPreview[];
  meeting: Meeting;
  deliveries: Delivery[];
  recordingMeetingIds: string[];
  integrations: IntegrationStatus;
  signedIn: boolean;
  preferences: Preferences;
  integrationStates: IntegrationStates;
  transcript: string;
  audioChecked?: boolean;
  duplicate: boolean;
  sent: number;
  skipped: number;
  remaining: number;
};
const api = (url: string, init?: RequestInit) =>
  requestJson<ApiResponse>(url, init);

export default function Trace({ children }: { children?: ReactNode }) {
  const router = useRouter(),
    pathname = usePathname(),
    query = useSearchParams();
  const route = workspaceRoute(pathname || "/workspace/meetings");
  const view = route?.view || "meetings",
    selected = route?.meetingId || null;
  const segment = query.get("segment"),
    tab = [
      "overview",
      "decisions",
      "actions",
      "questions",
      "activity",
    ].includes(query.get("tab") || "")
      ? query.get("tab")!
      : "overview",
    filter = (view === "meetings"
      ? ["all", "review"]
      : ["all", "pending", "done"]
    ).includes(query.get("filter") || "")
      ? query.get("filter")!
      : "all",
    projectFilter = query.get("project") || "";
  const [preferences, setPreferences] =
      useState<Preferences>(defaultPreferences),
    [integrationDetails, setIntegrationDetails] = useState<
      Partial<IntegrationStates>
    >({});
  const requestedSort = query.get("sort") || "";
  const allowedSorts =
    view === "meetings"
      ? meetingSorts.map((x) => String(x.id))
      : view === "actions"
        ? ["newest", "oldest", "alphabetical", "owner", "priority", "due"]
        : ["newest", "oldest", "alphabetical"];
  const sort = allowedSorts.includes(requestedSort)
    ? requestedSort
    : view === "meetings"
      ? preferences.meetingSort
      : "newest";
  function updateQuery(key: string, value: string) {
    const next = new URLSearchParams(query.toString());
    if (value && !(key === "filter" && value === "all")) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }
  const setFilter = (value: string) => updateQuery("filter", value);
  const setTab = (value: string) =>
    updateQuery("tab", value === "overview" ? "" : value);

  const [meetings, setMeetings] = useState<MeetingPreview[]>([]),
    [detail, setDetail] = useState<Meeting>(),
    [detailError, setDetailError] = useState<{ id: string; message: string }>(),
    [detailAttempt, setDetailAttempt] = useState(0),
    [deliveries, setDeliveries] = useState<Delivery[]>([]),
    [recordingMeetingIds, setRecordingMeetingIds] = useState<string[]>([]),
    [connections, setConnections] = useState(emptyStatus),
    [access, setAccess] = useState<Access>(),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState<ModalState>(null),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [signedIn, setSignedIn] = useState(false),
    [mobileNav, setMobileNav] = useState(false);
  function clearFilters() {
    setSearch("");
    router.replace(`/workspace/${view}`, { scroll: false });
  }
  const searchRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingAudio = useRef<{ meetingId: string; start: number } | null>(null);
  const audioStart = useRef(0);
  const [playingMeeting, setPlayingMeeting] = useState("");
  const [audioMessage, setAudioMessage] = useState("");
  useEffect(() => {
    if (!mobileNav) return;
    const frame = requestAnimationFrame(() =>
      document.querySelector<HTMLAnchorElement>(".sidebar .brand")?.focus(),
    );
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    const closeOnDesktop = () => {
      if (innerWidth > 760) setMobileNav(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
      cancelAnimationFrame(frame);
      document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus();
    };
  }, [mobileNav]);

  async function load() {
    setError("");
    try {
      const data = await api("/api/workspace");
      setMeetings(data.meetings);
      setDeliveries(data.deliveries);
      setRecordingMeetingIds(data.recordingMeetingIds);
      setAccess(data.access);
      setConnections(data.integrations);
      setSignedIn(data.signedIn);
      setPreferences(data.preferences);
      setIntegrationDetails(data.integrationStates);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && searchRef.current && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    setSearch("");
    setError("");
    setModal(null);
    setMobileNav(false);
  }, [pathname]);
  useEffect(() => {
    document.title = `${selected ? "Meeting" : view === "actions" ? "Action items" : view[0].toUpperCase() + view.slice(1)} · Trace`;
  }, [view, selected]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const current = detail?.id === selected ? detail : undefined;
  useEffect(() => {
    setDetail(undefined);
    setDetailError(undefined);
    if (!selected) return;
    const controller = new AbortController();
    api(`/api/meetings/${encodeURIComponent(selected)}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]),
    }).then(({ meeting }) => {
      if (controller.signal.aborted) return;
      setDetail(meeting);
      setMeetings((previous) => previous.map((row) =>
        row.id === meeting.id && row.revision < meeting.revision ? meetingPreview(meeting) : row,
      ));
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setDetailError({ id: selected, message: error.message });
    });
    return () => controller.abort();
  }, [selected, detailAttempt]);
  useEffect(() => {
    if (segment && current && !loading) {
      const turn = document.getElementById(`segment-${segment}`);
      turn?.focus({ preventScroll: true });
      turn?.scrollIntoView({ block: "center" });
    }
  }, [segment, current, loading]);
  const canPlay = (m: Pick<Meeting, "id">) => !!access && can(access.role, "review") &&
    recordingMeetingIds.includes(m.id);
  function playRecording(meetingId: string, start: number) {
    const player = audioRef.current;
    if (!player) return;
    setPlayingMeeting(meetingId);
    setAudioMessage("");
    audioStart.current = start;
    if (player.error) player.load();
    if (Number.isFinite(player.duration) && start >= player.duration) {
      player.pause();
      setAudioMessage("This timestamp falls outside the recording.");
      return;
    }
    player.currentTime = start;
    void player.play().catch((error: DOMException) => {
      if (error.name === "NotAllowedError" && audioRef.current === player)
        setAudioMessage("Press play to hear this timestamp.");
    });
  }
  useEffect(() => {
    const pending = pendingAudio.current;
    if (pending?.meetingId === selected && audioRef.current) {
      pendingAudio.current = null;
      playRecording(pending.meetingId, pending.start);
    }
  }, [selected, current, loading, recordingMeetingIds]);
  function navigate(next: View) {
    router.push(`/workspace/${next}`);
    setMobileNav(false);
  }
  function openMeeting(m: Pick<Meeting, "id">) {
    router.push(meetingPath(m.id));
  }
  function showEvidence(m: Meeting | MeetingPreview, id: string, play = true) {
    const path = meetingPath(m.id);
    const turn = ("segments" in m ? m.segments : m.turns).find((item) => item.id === id);
    if (play && turn && canPlay(m)) {
      if (selected === m.id && audioRef.current) playRecording(m.id, turn.start);
      else pendingAudio.current = { meetingId: m.id, start: turn.start };
    }
    const next = new URLSearchParams(pathname === path ? query.toString() : "");
    next.set("segment", id);
    router.push(`${path}?${next}`, { scroll: false });
    if (pathname === path && segment === id) {
      const turn = document.getElementById(`segment-${id}`);
      turn?.focus({ preventScroll: true });
      turn?.scrollIntoView({ block: "center" });
    }
  }
  async function persist(m: Meeting, correction?: Correction | { kind: "refreshLinear" }) {
    if (!signedIn) {
      setError("Sign in to save your changes.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const outputs = [...m.actions, ...m.decisions];
      const updated = access && can(access.role, "review") && !correction
        ? { ...m, reviewed: outputs.length > 0 && outputs.every((item) => item.approved) } : m;
      const data = await api(`/api/meetings/${encodeURIComponent(m.id)}`, {
        method: correction ? "POST" : "PUT",
        body: JSON.stringify(correction ? { ...correction, revision: m.revision } : updated),
      });
      setMeetings((prev) =>
        prev.map((x) => (x.id === m.id ? meetingPreview(data.meeting) : x)),
      );
      setDetail((previous) => previous?.id === m.id ? data.meeting : previous);
      setModal((previous) => previous?.type === "publish" && previous.meeting.id === m.id
        ? { ...previous, meeting: data.meeting } : previous);
      return data.meeting;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function withMeeting(m: Meeting | MeetingPreview, run: (meeting: Meeting) => void | Promise<unknown>) {
    if ("segments" in m) {
      await run(m);
      return;
    }
    const path = location.pathname;
    setBusy(true);
    setError("");
    try {
      const { meeting } = await api(`/api/meetings/${encodeURIComponent(m.id)}`);
      if (location.pathname !== path) return;
      if (meeting.revision !== m.revision) {
        const preview = meetingPreview(meeting);
        setMeetings((previous) => previous.map((row) => row.id === m.id ? preview : row));
        setError("This meeting changed. Review the latest draft and try again.");
        return;
      }
      await run(meeting);
    } catch (error) {
      if (location.pathname === path) setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied to clipboard");
    } catch {
      setError("Clipboard access is unavailable. Use Download instead.");
    }
  }
  const projects = [
    ...new Set([
      preferences.defaultProject,
      ...meetings.map((meeting) => meeting.project),
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const outstanding = meetings.filter((meeting) =>
    !meeting.reviewed && (!projectFilter || meeting.project === projectFilter),
  );
  const canEdit = !!access && can(access.role, "edit");
  const canReview = !!access && can(access.role, "review");
  function mergeTargets(m: Meeting, item: Action | Decision) {
    if ("linearFollowup" in item && item.linearFollowup) return [];
    const locked = new Set(deliveries.filter((delivery) => delivery.meetingId === m.id)
      .map((delivery) => delivery.itemId));
    if (!canReview || locked.has(item.id)) return [];
    return ("owner" in item ? m.actions : m.decisions)
      .filter((other) => other.id !== item.id && !locked.has(other.id) &&
        !("linearFollowup" in other && other.linearFollowup));
  }
  async function saveCorrection(m: Meeting, correction: Correction) {
    if (await persist(m, correction)) {
      setModal(null);
      setToast({
        action: "Action item added",
        decision: "Decision added",
        speaker: "Speaker label corrected",
        merge: "Drafts merged",
      }[correction.kind]);
    }
  }
  const allDecisions = sortOutputs(
      meetings.flatMap((m) =>
        m.decisions.map((item) => ({ meeting: m, item })),
      ),
      sort,
    ),
    allActions = sortOutputs(
      meetings.flatMap((m) => m.actions.map((item) => ({ meeting: m, item }))),
      sort,
    );
  const visibleMeetings = sortMeetings(
    meetings.filter(
      (m) =>
        (!projectFilter || m.project === projectFilter) &&
        (filter !== "review" || !m.reviewed) &&
        `${m.title} ${m.project} ${m.summary}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ),
    sort,
  );
  const published = deliveries.filter((d) => d.status === "sent").length;
  function refreshDelivery(delivery: Delivery) {
    setDeliveries((previous) => previous.map((item) => item.id === delivery.id ? delivery : item));
  }
  function evidence(m: Meeting | MeetingPreview, ids: string[]) {
    return (
      <div className="evidence-links">
        {ids.map((id) => {
          const s = ("segments" in m ? m.segments : m.turns).find((s) => s.id === id);
          return s ? (
            <button
              key={id}
              onClick={() => showEvidence(m, id)}
              title={`${canPlay(m) ? "Play" : "Read"} ${s.speaker} at ${time(s.start)}`}
            >
              {canPlay(m) ? <Play size={12} /> : <AudioLines size={12} />}
              {time(s.start)}
            </button>
          ) : null;
        })}
      </div>
    );
  }
  function decisionCard(m: Meeting | MeetingPreview, d: Decision, compact = false) {
    return (
      <article className="decision-card" key={`${m.id}-${d.id}`}>
        <div className="card-top">
          <span className={`badge ${d.approved ? "green" : "purple"}`}>
            <GitBranch size={11} />
            {d.approved ? "Accepted" : "Decision draft"}
          </span>
          <button
            className="icon-button"
            title="Edit decision"
            aria-label={`Edit ${d.title}`}
            disabled={busy || !canEdit || ((d.approved || m.reviewed) && !canReview)}
            onClick={() =>
              void withMeeting(m, (meeting) => setModal({ type: "editDecision", meeting, item: d }))
            }
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
        <h3>{d.title}</h3>
        <p>{compact ? d.context.slice(0, 140) : d.context}</p>
        {evidence(m, d.evidence)}
        <div className="card-bottom">
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void withMeeting(m, (meeting) => setModal({ type: "adr", meeting, item: d }))}
          >
            <FileText size={14} />
            View ADR draft
          </button>
          <button
            disabled={busy || loading || !access || !can(access.role, "review")}
            className={`approve-button ${d.approved ? "accepted" : ""}`}
            onClick={() =>
              withMeeting(m, (meeting) => persist({
                ...meeting,
                reviewed: false,
                decisions: meeting.decisions.map((x) =>
                  x.id === d.id ? { ...x, approved: !x.approved } : x,
                ),
              }))
            }
          >
            <Check size={13} />
            {d.approved ? "Accepted" : "Accept decision"}
          </button>
          {canReview && <button className="text-button" disabled={busy}
            onClick={() => { setError(""); void withMeeting(m, (meeting) => setModal({ type: "publish", meeting, itemIds: [d.id] })); }}>
            Publish decision
          </button>}
        </div>
      </article>
    );
  }
  function actionRow(m: Meeting | MeetingPreview, a: Action) {
    const sent = deliveries.filter(
      (d) =>
        d.meetingId === m.id &&
        d.itemId === a.id &&
        d.status === "sent" &&
        d.url,
    );
    return (
      <article
        key={`${m.id}-${a.id}`}
        className={`action-row ${a.completed ? "complete" : ""}`}
      >
        {a.linearFollowup ? (
          <span className="task-check" title="Linear follow-up" aria-label="Linear follow-up"><Link2 size={12} /></span>
        ) : (
        <button
          className={`task-check ${a.completed ? "checked" : ""}`}
          aria-label={`${a.completed ? "Reopen" : "Complete"} ${a.title}`}
          title={a.completed ? "Mark task as incomplete" : "Mark task as done"}
          disabled={busy || loading || !canEdit}
          onClick={() =>
            withMeeting(m, (meeting) => persist({
              ...meeting,
              actions: meeting.actions.map((x) =>
                x.id === a.id ? { ...x, completed: !x.completed } : x,
              ),
            }))
          }
        >
          {a.completed && <Check size={12} />}
        </button>
        )}
        <div className="action-body">
          <button
            className="action-title"
            disabled={busy || !canEdit || ((a.approved || m.reviewed) && !canReview)}
            onClick={() =>
              void withMeeting(m, (meeting) => setModal({ type: "editAction", meeting, item: a }))
            }
          >
            {a.title}
          </button>
          {!current && (
            <button className="meeting-context" onClick={() => openMeeting(m)}>
              {m.title}
            </button>
          )}
          {evidence(m, a.evidence)}
          {a.linearFollowup?.kind === "issue" && (
            <span className="field-hint">
              <a href={a.linearFollowup.url} target="_blank" rel="noreferrer">{a.linearFollowup.identifier}</a>
              {" · "}{a.linearFollowup.status ? `Proposed status: ${linearStatusLabels[a.linearFollowup.status]}` : "Existing issue · no status change"}
            </span>
          )}
          {a.linearFollowup?.kind === "ambiguous" && (
            <p className="field-hint">Several Linear issues match. Verify the issue in Linear before acting.</p>
          )}
          {sent.map((d) => (
            <a
              className="external-link"
              key={d.id}
              href={d.url}
              target="_blank"
              rel="noreferrer"
            >
              {d.followupOf ? "Open Linear issue" : `Assign in ${names[d.destination]}`} <ArrowRight size={12} />
            </a>
          ))}
          {canReview && a.linearFollowup?.kind !== "ambiguous" && <button className="text-button" disabled={busy}
            onClick={() => { setError(""); void withMeeting(m, (meeting) => setModal({ type: "publish", meeting, itemIds: [a.id] })); }}>
            {a.linearFollowup ? "Review Linear follow-up" : "Publish action"}
          </button>}
        </div>
        <span
          className={`priority ${a.priority.toLowerCase()}`}
          title={`${a.priority} priority`}
        >
          <i />
          <i />
          <i />
        </span>
        <span className="action-owner">
          {a.owner ? (
            <>
              <Avatar name={a.owner} size="xs" />
              <span>{a.owner.split(" ")[0]}</span>
            </>
          ) : (
            <span className="unassigned">Unassigned</span>
          )}
        </span>
        <button
          className={`mini-approve ${a.approved ? "accepted" : ""}`}
          disabled={busy || loading || !access || !can(access.role, "review")}
          aria-label={`${a.approved ? "Unapprove" : "Approve"} ${a.title}`}
          onClick={() =>
            withMeeting(m, (meeting) => persist({
              ...meeting,
              reviewed: false,
              actions: meeting.actions.map((x) =>
                x.id === a.id ? { ...x, approved: !x.approved } : x,
              ),
            }))
          }
        >
          <span>{a.approved ? "Approved" : "Approve"}</span>
        </button>
      </article>
    );
  }
  if (!route) return <>{children}</>;
  return (
    <div className="app-shell">
      {children}
      <aside id="sidebar" className={`sidebar ${mobileNav ? "open" : ""}`}>
        <a
          href="/workspace/meetings"
          onClick={(e) => {
            e.preventDefault();
            navigate("meetings");
          }}
          className="brand"
          aria-label="Trace home"
        >
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          trace<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">
            <Code2 size={18} />
          </span>
          <div>
            <strong>{preferences.workspaceName}</strong>
            <span>Team workspace</span>
          </div>
          <span className="workspace-status" title="Workspace active" />
        </div>
        <span className="nav-label">Workspace</span>
        <nav aria-label="Main navigation">
          {(
            [
              {
                id: "meetings",
                label: "Meetings",
                icon: AudioLines,
                count: meetings.length,
              },
              {
                id: "decisions",
                label: "Decisions",
                icon: GitBranch,
                count: allDecisions.length,
              },
              {
                id: "actions",
                label: "Action items",
                icon: ListTodo,
                count: allActions.filter((x) => !x.item.completed).length,
              },
              { id: "integrations", label: "Integrations", icon: Layers3 },
            ] as const
          ).map((n) => (
            <Link
              key={n.id}
              href={`/workspace/${n.id}`}
              onClick={() => setMobileNav(false)}
              aria-current={view === n.id ? "page" : undefined}
              className={`nav-item ${view === n.id ? "active" : ""}`}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {"count" in n && <span className="nav-count">{n.count}</span>}
            </Link>
          ))}
        </nav>
        {projects.length > 0 && (
          <div className="sidebar-projects">
            <span className="nav-label">Projects</span>
            {projects.map((project) => (
              <Link
                key={project}
                className={`project-nav ${projectFilter === project ? "selected" : ""}`}
                href={`/workspace/meetings?project=${encodeURIComponent(project)}`}
                onClick={() => setMobileNav(false)}
              >
                <span className="project-dot dot-0" />
                {project}
              </Link>
            ))}
          </div>
        )}
        <div className="sidebar-bottom">
          <button
            className="bottom-link"
            onClick={() => setModal({ type: "help" })}
          >
            <CircleHelp size={17} />
            Help & documentation
          </button>
          <Link
            className={`bottom-link ${view === "settings" ? "active" : ""}`}
            href="/workspace/settings"
            aria-current={view === "settings" ? "page" : undefined}
          >
            <Settings2 size={17} />
            Workspace settings
          </Link>
          <Link
            className="profile"
            href="/workspace/profile"
            aria-label="Open your profile"
          >
            <Avatar name={preferences.displayName} size="md" />
            <div>
              <strong>{preferences.displayName}</strong>
              <span>{preferences.email || "Your profile"}</span>
            </div>
            <ChevronRight size={13} />
          </Link>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="app-main" inert={mobileNav}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobileNav}
              aria-controls="sidebar"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={19} />
            </button>
            <span className="breadcrumb-icon">
              <Layers3 size={16} />
            </span>
            <Link href="/workspace/meetings">Workspace</Link>
            <ChevronRight size={13} />
            <Link
              href={`/workspace/${view}`}
              aria-current={!current ? "page" : undefined}
            >
              {view === "actions"
                ? "Action items"
                : view === "settings"
                  ? "Workspace settings"
                  : view[0].toUpperCase() + view.slice(1)}
            </Link>
            {current && (
              <>
                <ChevronRight size={13} />
                <strong>{current.title}</strong>
              </>
            )}
          </div>
          <div className="topbar-end">
            <span className="private-label">
              <ShieldCheck size={13} />
              Private workspace
            </span>
            <button
              className="icon-button"
              aria-label="Help"
              onClick={() => setModal({ type: "help" })}
            >
              <CircleHelp size={18} />
            </button>
            <Link href="/workspace/profile" aria-label="Open profile">
              <Avatar name={preferences.displayName} />
            </Link>
          </div>
        </header>
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button
              onClick={() => {
                setError("");
                if (!signedIn) location.href = "/login";
              }}
            >
              {signedIn ? "Dismiss" : "Sign in"}
              <X size={14} />
            </button>
          </div>
        )}
        {loading ? (
          <main className="loading-state">
            <LoaderCircle className="spin" size={24} />
            <p>Opening your workspace…</p>
          </main>
        ) : selected && !current && detailError?.id !== selected ? (
          <main className="loading-state">
            <LoaderCircle className="spin" size={24} />
            <p>Opening meeting…</p>
          </main>
        ) : current ? (
          <main className="detail-page">
            <button className="back-link" onClick={() => navigate("meetings")}>
              <ArrowLeft size={14} />
              All meetings
            </button>
            <div className="detail-heading">
              <div>
                <div className="heading-kicker">
                  {current.project && (
                    <span className="project-chip">
                      <span className="project-dot dot-0" />
                      {current.project}
                    </span>
                  )}
                  {current.source === "sample" && (
                    <span className="sample-label">Sample meeting</span>
                  )}
                </div>
                <h1>{current.title}</h1>
                <div className="meeting-meta">
                  <span>
                    <CalendarDays size={14} />
                    {dateLabel(current.date)},{" "}
                    {new Date(current.date).getUTCFullYear()}
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {Math.ceil(current.duration / 60)} min
                  </span>
                  <span>
                    <Video size={14} />
                    {current.platform}
                  </span>
                  <div className="avatar-stack">
                    {Array.from(new Set(current.segments.map((s) => s.speaker)))
                      .slice(0, 4)
                      .map((n) => (
                        <Avatar name={n} key={n} size="xs" />
                      ))}
                  </div>
                </div>
              </div>
              <div className="detail-controls">
                <button
                  className="button primary"
                  disabled={!access || !can(access.role, "review")}
                  onClick={() => setModal({ type: "publish", meeting: current })}
                >
                  <CheckCheck size={16} />
                  Publish outputs
                </button>
                {canReview && connections.linear && (
                  <button className="button" disabled={busy} onClick={async () => {
                    const refreshed = await persist(current, { kind: "refreshLinear" });
                    if (refreshed) setToast(refreshed.revision === current.revision
                      ? "No new Linear matches." : "Linear matches refreshed. Review the updated drafts.");
                  }}>
                    Check Linear history
                  </button>
                )}
              </div>
            </div>
            <div className="review-layout">
              <section className="review-content">
                {current.extraction === "rules" && (
                  <details className="extraction-help">
                    <summary>How drafts were extracted</summary>
                    <p>Rules find explicit decisions such as “we decided to” or “we’re going with,” and concrete commitments such as “I will” or “I’m going to.” There is no confidence-score cutoff. Use the transcript turn menu to add anything missed.</p>
                    <p>Decisions record an agreed choice and can be exported as an architecture decision record (ADR). Actions track follow-up work and can become issues. Approve selects work for publishing. The task checkbox tracks completion.</p>
                  </details>
                )}
                {tab === "overview" && current.extraction === "ai" && current.summary.trim() && (
                  <div className="review-summary">
                    <h2>Summary</h2>
                    <p>{current.summary}</p>
                  </div>
                )}
                <div
                  className="detail-tabs"
                  role="group"
                  aria-label="Meeting outputs"
                >
                  {[
                    "overview",
                    "decisions",
                    "actions",
                    ...(current.questions.length || tab === "questions" ? ["questions"] : []),
                    ...(deliveries.some((d) => d.meetingId === current.id) || tab === "activity" ? ["activity"] : []),
                  ].map((t) => (
                    <button
                      aria-pressed={tab === t}
                      key={t}
                      className={tab === t ? "active" : ""}
                      onClick={() => setTab(t)}
                    >
                      {t === "overview" ? "Review" : t === "actions"
                        ? "Action items"
                        : t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                {(tab === "overview" || tab === "decisions") && (
                  <section className="output-section">
                    <div className="section-heading">
                      <h2>
                        <GitBranch size={17} />
                        Decisions
                        <span className="count-pill">
                          {current.decisions.length}
                        </span>
                      </h2>
                    </div>
                    <div className="decision-list">
                      {current.decisions.map((d) => decisionCard(current, d))}
                    </div>
                    {!current.decisions.length && (
                      <div className="empty-small">
                        No explicit decisions found. Review the transcript for
                        any missing context.
                      </div>
                    )}
                  </section>
                )}
                {(tab === "overview" || tab === "actions") && (
                  <section className="output-section">
                    <div className="section-heading">
                      <h2>
                        <ListTodo size={17} />
                        Action items
                        <span className="count-pill">
                          {current.actions.length}
                        </span>
                      </h2>
                      <button
                        className="text-button"
                        onClick={() =>
                          download(
                            "action-items.json",
                            JSON.stringify(current.actions, null, 2),
                            "application/json",
                          )
                        }
                      >
                        <ArrowDownToLine size={14} />
                        Export
                      </button>
                    </div>
                    <div className="actions-list">
                      {current.actions.map((a) => actionRow(current, a))}
                    </div>
                    {!current.actions.length && (
                      <div className="empty-small">
                        No explicit commitments found in this transcript.
                      </div>
                    )}
                  </section>
                )}
                {(tab === "overview" || tab === "questions") &&
                  current.questions.length > 0 && (
                    <section className="output-section">
                      <div className="section-heading">
                        <h2>
                          <CircleHelp size={17} />
                          Open questions
                        </h2>
                      </div>
                      {current.questions.map((q, i) => (
                        <div className="question-row" key={i}>
                          <span>?</span>
                          <p>{q}</p>
                        </div>
                      ))}
                    </section>
                  )}
                {tab === "questions" && !current.questions.length && (
                  <div className="empty-small">
                    No open questions were extracted.
                  </div>
                )}
                {tab === "activity" && (
                  <section className="output-section">
                    <div className="section-heading">
                      <h2>Publishing activity</h2>
                    </div>
                    {deliveries
                      .filter((d) => d.meetingId === current.id)
                      .map((d) => (
                        <div key={d.id} className="delivery-row">
                          <AppIcon id={d.destination} />
                          <div>
                            <strong>{names[d.destination]} · {
                              current.actions.find((item) => item.id === d.itemId)?.title ??
                              current.decisions.find((item) => item.id === d.itemId)?.title ?? "Meeting summary"
                            }</strong>
                            <p>
                              {d.status === "sent"
                                ? "Published"
                                : d.status === "pending"
                                  ? "Publishing or awaiting reconciliation"
                                  : "Check destination before retrying"}
                            </p>
                            {d.error && <small>{d.error}</small>}
                            {canReview && <IssueDeliveryRecovery delivery={d} revision={current.revision}
                              disabled={busy} onUpdate={refreshDelivery} />}
                          </div>
                          {d.url && (
                            <a href={d.url} target="_blank" rel="noreferrer">
                              Open
                              <ArrowRight size={12} />
                            </a>
                          )}
                        </div>
                      ))}
                    {!deliveries.some((d) => d.meetingId === current.id) && (
                      <div className="empty-small">
                        No external actions yet. Approved outputs appear here
                        after publishing.
                      </div>
                    )}
                  </section>
                )}
                <div className="review-footer">
                  <button
                    className="text-button"
                    onClick={() =>
                      download(
                        "meeting.json",
                        JSON.stringify(current, null, 2),
                        "application/json",
                      )
                    }
                  >
                    Export meeting
                    <ArrowDownToLine size={13} />
                  </button>
                </div>
              </section>
              <aside className="transcript-panel">
                <div className="transcript-title">
                  <h2>
                    <AudioLines size={17} />
                    Source transcript
                  </h2>
                  <span className="transcript-duration">{time(current.duration)}</span>
                </div>
                {canPlay(current) && (
                  <div className="transcript-audio" hidden={playingMeeting !== current.id}>
                    <audio
                      key={current.id}
                      ref={audioRef}
                      src={`/api/meetings/${encodeURIComponent(current.id)}/audio`}
                      aria-label="Meeting recording"
                      controls
                      preload="none"
                      onLoadedMetadata={(event) => {
                        if (audioStart.current >= event.currentTarget.duration) {
                          event.currentTarget.pause();
                          setAudioMessage("This timestamp falls outside the recording.");
                        }
                      }}
                      onError={() => setAudioMessage("The recording is unavailable. Check the MeetStream connection or try again.")}
                      onPlay={() => setAudioMessage("")}
                    />
                    {audioMessage && <p role="status">{audioMessage}</p>}
                  </div>
                )}
                <div className="transcript-scroll">
                  {current.segments.map((s) => (
                    <article
                      tabIndex={-1}
                      id={`segment-${s.id}`}
                      key={s.id}
                      className={`transcript-turn ${segment === s.id ? "highlight" : ""}`}
                    >
                      <div>
                        <Avatar name={s.speaker} size="xs" />
                        <strong title={s.previousSpeakers?.[0] && s.previousSpeakers[0] !== s.speaker
                          ? `Originally labeled ${s.previousSpeakers[0]}` : undefined}>{s.speaker}</strong>
                        <button
                          title={canPlay(current) ? "Play from this timestamp" : "Read this transcript turn"}
                          onClick={() => showEvidence(current, s.id)}
                        >
                          {time(s.start)}
                        </button>
                        {canReview && (
                          <button
                            type="button"
                            className="turn-review-button"
                            aria-label={`Review transcript turn at ${time(s.start)}`}
                            title="Review this turn"
                            onClick={() => {
                              setError("");
                              setModal({ type: "correctTurn", meeting: current, turn: s });
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        )}
                      </div>
                      <p>{s.text}</p>
                    </article>
                  ))}
                </div>
              </aside>
            </div>
          </main>
        ) : selected ? (
          <main className="empty-state">
            <FileText size={32} />
            <h1>Could not open the meeting</h1>
            <p role="alert">{detailError?.message}</p>
            <button className="button" onClick={() => setDetailAttempt((attempt) => attempt + 1)}>
              Try again
            </button>
            <button className="button" onClick={() => navigate("meetings")}>
              Back to meetings
            </button>
          </main>
        ) : view === "meetings" ? (
          <main className="dashboard meetings-page">
            <div className="page-heading">
              <div>
                <h1>Meetings</h1>
                <p>
                  Import a transcript to draft decisions and follow-up tasks
                  with links to what was said.
                </p>
              </div>
              {canEdit && (
                <div className="meeting-entry-actions">
                  <button className="button" onClick={() => setModal({ type: "import", source: "paste" })}>
                    <FileText size={16} /> Import transcript
                  </button>
                  <button className="button primary" onClick={() => setModal({ type: "import", source: "meetstream" })}>
                    <Video size={16} /> Send bot to meeting
                  </button>
                </div>
              )}
            </div>
            {projectFilter && (
              <div className="project-context">
                <strong>{projectFilter}</strong>
                {access &&
                  can(access.role, "manage") &&
                  projects.includes(projectFilter) && (
                    <button
                      className="button"
                      onClick={() =>
                        setModal({ type: "removeProject", name: projectFilter })
                      }
                    >
                      Remove project
                    </button>
                  )}
              </div>
            )}
            <section className="meetings-section">
              <div className="list-toolbar meetings-toolbar">
                <div className="filter-tabs" role="group" aria-label="Review status">
                  {[
                    { id: "all", label: "All meetings" },
                    { id: "review", label: "Needs review" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      className={filter === f.id ? "active" : ""}
                      aria-pressed={filter === f.id}
                      onClick={() => setFilter(f.id)}
                    >
                      {f.label}
                      {f.id === "review" && outstanding.length > 0 && (
                        <span>{outstanding.length}</span>
                      )}
                    </button>
                  ))}
                </div>
                <label className="search-box">
                  <Search size={15} />
                  <input
                    ref={searchRef}
                    aria-label="Search meetings"
                    placeholder="Search meetings…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <kbd>⌘ K</kbd>
                </label>
                <div className="meeting-list-controls">
                  <label>
                    <select
                      aria-label="Filter by project"
                      value={projectFilter}
                      onChange={(e) => updateQuery("project", e.target.value)}
                    >
                      <option value="">All projects</option>
                      {[...new Set([...projects, projectFilter])]
                        .filter(Boolean)
                        .map((project) => (
                          <option key={project}>{project}</option>
                        ))}
                    </select>
                  </label>
                  <label>
                    <select
                      aria-label="Sort meetings"
                      value={sort}
                      onChange={(e) => updateQuery("sort", e.target.value)}
                    >
                      {meetingSorts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="meeting-list">
                {visibleMeetings.map((m) => (
                  <Link
                    className="meeting-row"
                    key={m.id}
                    href={meetingPath(m.id)}
                  >
                    <span className="meeting-icon">
                      <AudioLines size={18} aria-hidden="true" />
                    </span>
                    <span className="meeting-info">
                      <strong>{m.title}</strong>
                      <span>
                        {m.project && (
                          <>
                            <span className="project-dot dot-0" />
                            {m.project}
                            <i />
                          </>
                        )}
                        {dateLabel(m.date)}
                        <i />
                        {Math.ceil(m.duration / 60)} min
                      </span>
                    </span>
                    <span className="row-outputs">
                      <span>
                        {m.decisions.length} {m.decisions.length === 1 ? "decision" : "decisions"}
                      </span>
                      <span>
                        {m.actions.length} {m.actions.length === 1 ? "action" : "actions"}
                      </span>
                    </span>
                    <span
                      className={`meeting-status ${m.reviewed ? "reviewed" : "needs-review"}`}
                    >
                      {m.reviewed ? (
                        <Check size={11} />
                      ) : (
                        <span className="tiny-dot" />
                      )}
                      {m.reviewed ? "Reviewed" : "Needs review"}
                    </span>
                    <ChevronRight size={15} className="row-chevron" aria-hidden="true" />
                  </Link>
                ))}
              </div>
              {!visibleMeetings.length && (
                <div className="empty-state">
                  <AudioLines size={26} />
                  <h3>
                    {loading
                      ? "Loading meetings…"
                      : meetings.length
                        ? "No matching meetings"
                        : "No meetings yet"}
                  </h3>
                  {!loading && (
                    <p>
                      {meetings.length
                        ? "Try another search or clear your filters."
                        : "Import a transcript to draft decisions and follow-up tasks."}
                    </p>
                  )}
                  {!loading && meetings.length > 0 && (
                    <button className="button" onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </section>
          </main>
        ) : view === "decisions" || view === "actions" ? (
          <main className="collection-page">
            <div className="page-heading">
              <div>
                <h1>{view === "decisions" ? "Decisions" : "Action items"}</h1>
                <p>
                  {view === "decisions"
                    ? "Review what the team agreed, check the evidence, and export an architecture decision record."
                    : "Check who owns each follow-up, approve the draft, and publish it as an issue from its meeting."}
                </p>
              </div>
              <button
                className="button"
                onClick={() =>
                  download(
                    `${view}.json`,
                    JSON.stringify(
                      (view === "decisions" ? allDecisions : allActions).map(
                        ({ meeting, item }) => ({
                          ...item,
                          meeting: {
                            id: meeting.id,
                            title: meeting.title,
                            date: meeting.date,
                            project: meeting.project,
                          },
                          evidence: item.evidence.map((segment) =>
                            evidenceUrl(location.origin, meeting, segment),
                          ),
                        }),
                      ),
                      null,
                      2,
                    ),
                    "application/json",
                  )
                }
              >
                <ArrowDownToLine size={15} />
                Export {view === "decisions" ? "decisions" : "action items"}
              </button>
            </div>
            <div className="list-toolbar collection-toolbar">
              <div className="filter-tabs">
                {[
                  { id: "all", label: "All" },
                  {
                    id: "pending",
                    label: view === "decisions" ? "Drafts" : "To do",
                  },
                  {
                    id: "done",
                    label: view === "decisions" ? "Accepted" : "Completed",
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    className={filter === f.id ? "active" : ""}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <label className="search-box">
                <Search size={15} />
                <input
                  ref={searchRef}
                  aria-label={`Search ${view}`}
                  placeholder={`Search ${view === "actions" ? "action items" : "decisions"}…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            <div className="collection-sort">
              <label>
                Sort
                <select
                  aria-label={`Sort ${view === "actions" ? "action items" : "decisions"}`}
                  value={sort}
                  onChange={(e) => updateQuery("sort", e.target.value)}
                >
                  {[
                    { id: "newest", label: "Newest meeting" },
                    { id: "oldest", label: "Oldest meeting" },
                    { id: "alphabetical", label: "Title A–Z" },
                    ...(view === "actions"
                      ? [
                          { id: "priority", label: "Priority" },
                          { id: "owner", label: "Owner" },
                          { id: "due", label: "Due date" },
                        ]
                      : []),
                  ].map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {view === "decisions" ? (
              <div className="decisions-grid">
                {allDecisions
                  .filter(
                    ({ item }) =>
                      (filter === "all" ||
                        (filter === "done" ? item.approved : !item.approved)) &&
                      `${item.title} ${item.context}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map(({ meeting, item }) => (
                    <div key={`${meeting.id}-${item.id}`}>
                      <button
                        className="collection-context"
                        onClick={() => openMeeting(meeting)}
                      >
                        <AudioLines size={13} />
                        {meeting.title}
                        <ChevronRight size={12} />
                      </button>
                      {decisionCard(meeting, item, true)}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="actions-list collection-actions">
                {allActions
                  .filter(
                    ({ item }) =>
                      (filter === "all" ||
                        (filter === "done"
                          ? item.completed
                          : !item.completed)) &&
                      `${item.title} ${item.owner}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map(({ meeting, item }) => actionRow(meeting, item))}
              </div>
            )}
            {(view === "decisions"
              ? allDecisions.filter(
                  ({ item }) =>
                    (filter === "all" ||
                      (filter === "done" ? item.approved : !item.approved)) &&
                    `${item.title} ${item.context}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
              : allActions.filter(
                  ({ item }) =>
                    (filter === "all" ||
                      (filter === "done" ? item.completed : !item.completed)) &&
                    `${item.title} ${item.owner}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
            ).length === 0 && (
              <div className="empty-state">
                <Search size={26} />
                <h3>
                  No matching{" "}
                  {view === "actions" ? "action items" : "decisions"}
                </h3>
                <p>
                  {meetings.length
                    ? "Try another search or clear your filters."
                    : "Import a meeting transcript to start reviewing drafts."}
                </p>
                {meetings.length ? (
                  <button className="button" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : (
                  <Link className="button" href="/workspace/meetings">
                    Go to meetings
                  </Link>
                )}
              </div>
            )}
          </main>
        ) : view === "profile" || view === "settings" ? (
          access && can(access.role, "manage") ? (
            <div>
              <PreferencesPage
                key={view}
                kind={view}
                preferences={preferences}
                onSaved={setPreferences}
              />
              {view === "settings" && <WorkspaceAdmin access={access} />}
            </div>
          ) : (
            <main className="preferences-page">
              <h1>Workspace access</h1>
              <p>Your role is {access?.role}.</p>
              <button
                className="button"
                onClick={async () => {
                  try {
                    await api("/api/auth/logout", { method: "POST" });
                    location.replace("/login");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Sign out
              </button>
            </main>
          )
        ) : (
          <IntegrationsPage
            states={integrationDetails}
            speakers={Array.from(
              new Set(
                meetings.flatMap((m) => m.turns.map((s) => s.speaker)),
              ),
            )}
            onUpdated={load}
            renderIcon={(id) => <AppIcon id={id} />}
          />
        )}
      </div>
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {modal?.type === "removeProject" && (
        <Modal
          title={`Remove ${modal.name}?`}
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <div className="modal-body">
            <p>
              Meetings in this project will become unassigned. Their
              transcripts, decisions, and published links will stay available.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="button"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api("/api/projects", {
                    method: "DELETE",
                    body: JSON.stringify({ name: modal.name }),
                  });
                  await load();
                  clearFilters();
                  setModal(null);
                  setToast("Project removed. Its meetings are now unassigned.");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove project
            </button>
          </div>
        </Modal>
      )}
      {modal?.type === "import" && access && can(access.role, "edit") && (
        <ImportModal
          initialSource={modal.source ?? "paste"}
          defaultProject={projectFilter || preferences.defaultProject}
          botStorageKey={`trace:meetstream-bot:${access.workspace}:${access.actor}`}
          signedIn={signedIn}
          connections={connections}
          onClose={() => setModal(null)}
          onImported={(m, duplicate, audioChecked) => {
            setMeetings((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [meetingPreview(m), ...prev],
            );
            setModal(null);
            openMeeting(m);
            if (m.source === "meetstream" || duplicate) void load();
            setToast(
              duplicate
                ? "This transcript is already in your workspace. No duplicate created."
                : m.source === "meetstream" && audioChecked === false
                  ? "Meeting imported with MeetStream’s timestamps. Recording check unavailable."
                  : "Meeting imported. Your drafts are ready for review.",
            );
          }}
        />
      )}
      {modal?.type === "correctTurn" && (
        <CorrectTurnModal
          meeting={modal.meeting}
          turn={modal.turn}
          busy={busy}
          error={error}
          onClose={() => { if (!busy) { setError(""); setModal(null); } }}
          onSave={(correction) => saveCorrection(modal.meeting, correction)}
          onCopy={() => copy(evidenceUrl(location.origin, modal.meeting, modal.turn.id))}
        />
      )}
      {modal?.type === "mergeDraft" && (
        <MergeDraftModal
          item={modal.item}
          targets={mergeTargets(modal.meeting, modal.item)}
          busy={busy}
          error={error}
          onClose={() => { if (!busy) { setError(""); setModal(null); } }}
          onSave={(keepId) => saveCorrection(modal.meeting, {
            kind: "merge", keepId, removeId: modal.item.id,
          })}
        />
      )}
      {modal?.type === "editDecision" && (
        <EditDecisionModal
          error={error}
          meeting={modal.meeting}
          item={modal.item}
          busy={busy}
          onMerge={mergeTargets(modal.meeting, modal.item).length ? () => {
            setError("");
            setModal({ ...modal, type: "mergeDraft" });
          } : undefined}
          onClose={() => setModal(null)}
          onSave={async (d) => {
            const m = modal.meeting;
            if (
              await persist({
                ...m,
                reviewed: false,
                decisions: m.decisions.map((x) =>
                  x.id === d.id ? { ...d, approved: false } : x,
                ),
              })
            ) {
              setModal(null);
              setToast("Decision saved");
            }
          }}
        />
      )}
      {modal?.type === "editAction" && (
        <EditActionModal
          error={error}
          meeting={modal.meeting}
          item={modal.item}
          busy={busy}
          onMerge={mergeTargets(modal.meeting, modal.item).length ? () => {
            setError("");
            setModal({ ...modal, type: "mergeDraft" });
          } : undefined}
          onClose={() => setModal(null)}
          onSave={async (a) => {
            const m = modal.meeting;
            if (
              await persist({
                ...m,
                reviewed: false,
                actions: m.actions.map((x) =>
                  x.id === a.id ? { ...a, approved: false } : x,
                ),
              })
            ) {
              setModal(null);
              setToast("Action item saved");
            }
          }}
        />
      )}
      {modal?.type === "adr" && (
        <Modal
          title="Architecture decision record"
          onClose={() => setModal(null)}
          wide
        >
          <div className="modal-body">
            <span className="badge purple">
              {modal.item.approved ? "Accepted" : "Proposed"} · Editable draft
            </span>
            <pre className="adr-preview">
              {adrMarkdown(
                modal.meeting,
                modal.item,
                typeof location !== "undefined" ? location.origin : "",
                (text) => text,
              )}
            </pre>
          </div>
          <div className="modal-footer">
            <button
              className="button"
              onClick={() =>
                copy(adrMarkdown(modal.meeting, modal.item, location.origin))
              }
            >
              <Copy size={14} />
              Copy Markdown
            </button>
            <button
              className="button"
              onClick={() => {
                const m = modal;
                setModal({
                  type: "editDecision",
                  meeting: m.meeting,
                  item: m.item,
                });
              }}
            >
              Edit draft
            </button>
            <button
              className="button primary"
              onClick={() =>
                download(
                  `${modal.item.id}.md`,
                  adrMarkdown(modal.meeting, modal.item, location.origin),
                )
              }
            >
              <ArrowDownToLine size={14} />
              Download ADR
            </button>
          </div>
        </Modal>
      )}
      {modal?.type === "publish" && access && can(access.role, "review") && (
        <PublishModal
          meeting={modal.meeting}
          connections={connections}
          deliveries={deliveries}
          onDeliveryUpdate={refreshDelivery}
          busy={busy}
          onClose={() => setModal(null)}
          itemIds={modal.itemIds}
          onToggle={async (itemId, approved) => {
            const m = modal.meeting;
            await persist({
              ...m, reviewed: false,
              actions: m.actions.map((item) => item.id === itemId ? { ...item, approved } : item),
              decisions: m.decisions.map((item) => item.id === itemId ? { ...item, approved } : item),
            });
          }}
          onPublish={async (destinations) => {
            setBusy(true);
            try {
              const m = modal.meeting;
              const data = await api("/api/publish", {
                method: "POST",
                body: JSON.stringify({
                  meetingId: m.id,
                  revision: m.revision,
                  destinations,
                  itemIds: modal.itemIds,
                }),
              });
              setDeliveries(data.deliveries);
              setToast(
                `${data.sent} outputs published. ${data.skipped} previous deliveries skipped.`,
              );
              return data;
            } catch (e) {
              throw e;
            } finally {
              setBusy(false);
            }
          }}
          onCopy={() =>
            copy(
              summaryMarkdown(
                {
                  ...modal.meeting,
                  actions: modal.meeting.actions.filter((item) => !modal.itemIds || modal.itemIds.includes(item.id)),
                  decisions: modal.meeting.decisions.filter((item) => !modal.itemIds || modal.itemIds.includes(item.id)),
                },
                location.origin,
              ),
            )
          }
        />
      )}
      {modal?.type === "help" && (
        <Modal
          title="A conversation, carried forward"
          onClose={() => setModal(null)}
        >
          <div className="modal-body help-body">
            <p>
              Trace turns engineering meetings into decisions, ADR drafts and
              owned action items. Every output links back to its source.
            </p>
            <ol>
              <li>
                <b>Bring the conversation.</b> Import a timestamped transcript
                or fetch one from MeetStream.
              </li>
              <li>
                <b>Make it accurate.</b> Check the evidence, edit the drafts and
                confirm owners.
              </li>
              <li>
                <b>Move the work forward.</b> Publish approved outputs to your
                connected tools, or export Markdown and JSON.
              </li>
            </ol>
            <div className="inline-note">
              <ShieldCheck size={17} />
              Rule-based extraction finds explicit agreements; configure Claude
              for contextual extraction.
            </div>
            <a
              className="button full"
              href="https://github.com/Arjun220905/engineering-decision-agent"
              target="_blank"
              rel="noreferrer"
            >
              <Github size={16} />
              Read the documentation
              <ArrowRight size={14} />
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ImportModal({
  initialSource,
  onClose,
  onImported,
  signedIn,
  connections,
  defaultProject,
  botStorageKey,
}: {
  onClose: () => void;
  onImported: (m: Meeting, d: boolean, audioChecked?: boolean) => void;
  signedIn: boolean;
  connections: IntegrationStatus;
  defaultProject: string;
  botStorageKey: string;
  initialSource: "paste" | "meetstream";
}) {
  const [source, setSource] = useState(initialSource),
    [title, setTitle] = useState(""),
    [project, setProject] = useState(defaultProject),
    [transcript, setTranscript] = useState(""),
    [transcriptId, setTranscriptId] = useState(""),
    [botId, setBotId] = useState(""),
    [selectedTrackedBotId, setSelectedTrackedBotId] = useState(""),
    [meetingLink, setMeetingLink] = useState(""),
    [sendingBot, setSendingBot] = useState(false),
    [botAction, setBotAction] = useState(""),
    [bots, setBots] = useState<MeetStreamBot[]>([]),
    [botStatuses, setBotStatuses] = useState<Record<string, MeetStreamBotStatus>>({}),
    [botListError, setBotListError] = useState(""),
    [refreshBots, setRefreshBots] = useState(0),
    [date, setDate] = useState(() => localDate()),
    [showImported, setShowImported] = useState(false),
    [useAI, setUseAI] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const botRequest = useRef<{ inviteHash: string; id: string } | null>(null);
  const sending = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(botStorageKey);
      if (saved && /^[a-zA-Z0-9_-]{1,200}$/.test(saved)) setBotId(saved);
    } catch {
      // Older browser-only bot IDs can also be entered manually.
    }
  }, [botStorageKey]);

  useEffect(() => {
    if (source !== "meetstream") return;
    const signal = new AbortController();
    const settled = new Set<string>();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const { bots } = await requestJson<{ bots: MeetStreamBot[] }>(
          "/api/meetstream/bots", { signal: signal.signal },
        );
        if (signal.signal.aborted) return;
        setBots(bots);
        setBotListError("");
        const pending = bots.filter((bot) => !bot.meetingId && !settled.has(bot.id));
        if (!connections.meetstream) return;
        for (let i = 0; i < pending.length && !signal.signal.aborted; i += 4) {
          const results = await Promise.all(pending.slice(i, i + 4).map(async (bot) => {
            try {
              const { status } = await requestJson<{ status: MeetStreamBotStatus }>(
                `/api/meetstream/bots?botId=${encodeURIComponent(bot.id)}`, { signal: signal.signal },
              );
              if (status.settled) settled.add(bot.id);
              return [bot.id, status] as const;
            } catch {
              return [bot.id, { label: "Status unavailable", canStop: true, ready: false, settled: false }] as const;
            }
          }));
          if (!signal.signal.aborted)
            setBotStatuses((previous) => ({ ...previous, ...Object.fromEntries(results) }));
        }
      } catch (error) {
        if (!signal.signal.aborted) setBotListError((error as Error).message);
      } finally {
        if (!signal.signal.aborted) timer = setTimeout(refresh, 12000);
      }
    }
    void refresh();
    return () => {
      signal.abort();
      clearTimeout(timer);
    };
  }, [source, connections.meetstream, refreshBots]);

  async function sendBot() {
    const link = meetingLink.trim();
    if (sending.current || busy || !link || !connections.meetstream) return;
    sending.current = true;
    setSendingBot(true);
    setError("");
    try {
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(link));
      const inviteHash = Array.from(new Uint8Array(hash), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      const retryKey = botStorageKey + ":pending:" + inviteHash;
      if (botRequest.current?.inviteHash !== inviteHash) {
        let saved = "";
        try { saved = sessionStorage.getItem(retryKey) ?? ""; } catch {}
        botRequest.current = { inviteHash, id: saved || crypto.randomUUID() };
        try { sessionStorage.setItem(retryKey, botRequest.current.id); } catch {}
      }
      const result = await requestJson<{ botId: string }>(
        "/api/meetstream/bots",
        {
          method: "POST",
          body: JSON.stringify({
            meetingLink: link,
            requestId: botRequest.current.id,
          }),
        },
      );
      setBotId(result.botId);
      setSelectedTrackedBotId(result.botId);
      setRefreshBots((value) => value + 1);
      setTranscriptId("");
      setMeetingLink("");
      botRequest.current = null;
      try { sessionStorage.removeItem(retryKey); } catch {}
    } catch (e) {
      setError((e as Error).message);
    } finally {
      sending.current = false;
      setSendingBot(false);
    }
  }

  async function updateBot(action: "stop" | "track", id: string) {
    if (sending.current || busy) return;
    sending.current = true;
    setBotAction(`${action}:${id}`);
    setError("");
    try {
      await requestJson("/api/meetstream/bots", {
        method: "POST",
        body: JSON.stringify({ action, botId: id }),
      });
      if (action === "track") setSelectedTrackedBotId(id);
      setRefreshBots((value) => value + 1);
      if (action === "stop")
        setBots((previous) => previous.map((bot) =>
          bot.id === id ? { ...bot, stopRequestedAt: Date.now() } : bot,
        ));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      sending.current = false;
      setBotAction("");
    }
  }

  const selectedBot = bots.find((bot) => bot.id === botId.trim());
  const importedBotCount = bots.filter((bot) => bot.meetingId).length;
  const visibleBots = bots.filter((bot) => showImported || !bot.meetingId);
  const readyToImport = source === "paste"
    ? Boolean(transcript.trim())
    : connections.meetstream && Boolean(transcriptId.trim() || (botId.trim() &&
      (selectedBot?.meetingId || botStatuses[botId.trim()]?.ready ||
        (!selectedBot && botId.trim() !== selectedTrackedBotId))));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending.current || busy || !readyToImport) return;
    if (!signedIn) {
      location.href = "/login";
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/meetings", {
        method: "POST",
        body: JSON.stringify({
          title,
          project,
          ...(source === "meetstream"
            ? {
                transcriptId: transcriptId.trim() || undefined,
                botId: botId.trim() || undefined,
              }
            : { transcript }),
          date: new Date(`${date || localDate()}T12:00:00Z`).toISOString(),
          useAI,
        }),
      });
      if (source === "meetstream" && botId.trim()) {
        try {
          if (localStorage.getItem(botStorageKey) === botId.trim()) {
            localStorage.removeItem(botStorageKey);
            localStorage.removeItem(botStorageKey + ":stopped");
          }
        } catch {
          // Import already succeeded.
        }
      }
      onImported(
        data.meeting,
        data.duplicate,
        source === "meetstream" ? data.audioChecked : undefined,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Import meeting"
      onClose={() => {
        if (!busy && !sending.current) onClose();
      }}
      wide
    >
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="source-tabs">
            <button
              type="button"
              className={source === "paste" ? "active" : ""}
              aria-pressed={source === "paste"}
              disabled={busy || sendingBot || !!botAction}
              onClick={() => {
                setSource("paste");
                setError("");
              }}
            >
              <FileText size={15} />
              Paste or upload
            </button>
            <button
              type="button"
              className={source === "meetstream" ? "active" : ""}
              aria-pressed={source === "meetstream"}
              disabled={busy || sendingBot || !!botAction}
              onClick={() => {
                setSource("meetstream");
                setError("");
              }}
            >
              <AudioLines size={15} />
              Send bot / MeetStream
            </button>
          </div>
          {source === "paste" ? (
            <div className="transcript-input">
              <label className="field">
                Transcript
                <textarea
                  required
                  rows={6}
                  placeholder={"[00:12] Alex: We decided to use cursor pagination."}
                  value={transcript}
                  maxLength={500000}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </label>
              <label className="upload-label">
                <ArrowDownToLine size={14} />
                Upload transcript
                <input
                  type="file"
                  aria-label="Upload transcript"
                  accept=".txt,.json,.md,text/plain,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (file.size > 500000) {
                      setError("Choose a file under 500 KB.");
                      return;
                    }
                    try {
                      setTranscript(await file.text());
                      setTitle((value) => value || file.name.replace(/\.[^.]+$/, "").slice(0, 200));
                      setError("");
                    } catch {
                      setError("Could not read this file. Try uploading it again.");
                    }
                  }}
                />
              </label>
            </div>
          ) : (
            <div>
              {connections.meetstream ? (
                <>
                  <label className="field">
                    Meeting link
                    <span className="field-hint">
                      Google Meet, Zoom, or Microsoft Teams
                    </span>
                    <input
                      inputMode="url"
                      value={meetingLink}
                      maxLength={2048}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="https://meet.google.com/…"
                      disabled={sendingBot || busy}
                    />
                  </label>
                  <button
                    type="button"
                    className="button"
                    disabled={
                      busy || sendingBot || !!botAction || !meetingLink.trim()
                    }
                    onClick={sendBot}
                  >
                    {sendingBot ? "Sending bot…" : "Send bot to meeting"}
                  </button>
                  <span className="field-hint bot-admission-hint">
                    Admit Trace Notetaker from the meeting lobby to start recording.
                  </span>
                </>
              ) : (
                <p className="field-hint">
                  Connect MeetStream in{" "}
                  <Link
                    href="/workspace/integrations?app=meetstream"
                    onClick={onClose}
                  >
                    Integrations
                  </Link>{" "}
                  to send a bot or import by ID.
                </p>
              )}
              <section className="meetstream-bots" aria-label="Workspace bots">
                <div className="meetstream-bot-row">
                  <strong>Workspace bots</strong>
                  {(visibleBots.length > 0 || botListError) && (
                    <button type="button" className="text-button" onClick={() => setRefreshBots((value) => value + 1)}>
                      Refresh
                    </button>
                  )}
                </div>
                {botListError && <p className="field-hint" role="alert">{botListError}</p>}
                {!botListError && !visibleBots.length && <p className="field-hint">No bots waiting for a transcript or import.</p>}
                {visibleBots.length > 0 && <ul className="meetstream-bot-list">
                  {visibleBots.map((bot) => {
                    const status = botStatuses[bot.id];
                    const canStop = !bot.meetingId && status?.canStop;
                    const waitingForStop = Boolean(bot.stopRequestedAt &&
                      Date.now() - bot.stopRequestedAt < botStopRetryMs);
                    return (
                      <li className="meetstream-bot-row" key={bot.id}>
                        <div>
                          <strong>{bot.label}</strong>
                          <p className="field-hint">
                            {new Date(bot.createdAt).toLocaleString()} · {bot.id.slice(0, 8)}
                          </p>
                          <p className="field-hint" role="status">
                            {bot.meetingId ? "Imported"
                              : waitingForStop && (!status || canStop) ? "Stop requested · Waiting for bot to leave"
                              : status?.label ?? (connections.meetstream ? "Checking status…" : "MeetStream disconnected")}
                          </p>
                        </div>
                        {bot.meetingId ? (
                          <Link className="button" href={meetingPath(bot.meetingId)} onClick={onClose}>Open meeting</Link>
                        ) : status?.ready ? (
                          <button
                            type="button" className="button"
                            disabled={busy || sendingBot || !!botAction || bot.id === botId}
                            onClick={() => {
                              setBotId(bot.id);
                              setSelectedTrackedBotId(bot.id);
                              setTranscriptId("");
                              setError("");
                              titleRef.current?.focus();
                            }}
                          >
                            {bot.id === botId ? "Selected for import" : "Use transcript"}
                          </button>
                        ) : canStop && !waitingForStop && (
                          <button
                            type="button" className="button"
                            disabled={busy || sendingBot || !!botAction || !connections.meetstream}
                            onClick={() => updateBot("stop", bot.id)}
                          >
                            {botAction === `stop:${bot.id}` ? "Stopping bot…"
                              : bot.stopRequestedAt ? "Retry stop" : "Stop bot"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>}
                {importedBotCount > 0 && (
                  <button type="button" className="text-button"
                    aria-expanded={showImported}
                    onClick={() => setShowImported((value) => !value)}>
                    {showImported ? "Hide imported bots" : `Show imported bots (${importedBotCount})`}
                  </button>
                )}
              </section>
              <details className="import-options">
                <summary>Import by ID</summary>
                <label className="field">
                  MeetStream bot ID
                  <input
                    value={botId}
                    onChange={(e) => {
                      setBotId(e.target.value);
                      setSelectedTrackedBotId("");
                    }}
                    placeholder="Paste bot ID"
                  />
                </label>
                {connections.meetstream && /^[a-zA-Z0-9_-]{1,200}$/.test(botId.trim())
                  && !selectedBot && (
                    <button type="button" className="button" disabled={busy || sendingBot || !!botAction}
                      onClick={() => updateBot("track", botId.trim())}>
                      {botAction ? "Tracking bot…" : "Track existing bot"}
                    </button>
                  )}
                <label className="field">
                  MeetStream transcript ID
                  <input
                    placeholder="Paste transcript ID"
                    value={transcriptId}
                    onChange={(e) => setTranscriptId(e.target.value)}
                  />
                </label>
              </details>
            </div>
          )}
          <label className="field import-title">
            Meeting title
            <input
              ref={titleRef}
              required
              maxLength={200}
              placeholder="e.g. API architecture review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <details className="import-options">
            <summary>Meeting details</summary>
            <div className="form-grid">
              <label className="field">
                Project
                <input maxLength={100} value={project} placeholder="Unassigned"
                  onChange={(e) => setProject(e.target.value)} />
              </label>
              <label className="field">
                Meeting date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>
            {connections.ai && (
              <label className="checkbox-label">
                <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
                <span>
                  Use Claude for extraction
                  <small>Sends the transcript to Anthropic.</small>
                </span>
              </label>
            )}
          </details>
          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="button"
            disabled={busy || sendingBot || !!botAction}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={busy || sendingBot || !!botAction || !readyToImport}
          >
            {busy ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Sparkles size={15} />
            )}{" "}
            {busy
              ? "Preparing drafts…"
              : signedIn
                ? "Create meeting drafts"
                : "Sign in to import"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function CorrectTurnModal({
  meeting, turn, busy, error, onClose, onSave, onCopy,
}: {
  meeting: Meeting;
  turn: Segment;
  busy: boolean;
  error: string;
  onClose: () => void;
  onCopy: () => void;
  onSave: (correction: Correction) => void;
}) {
  const [kind, setKind] = useState<"decision" | "action" | "speaker">("decision");
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState(turn.speaker);
  const [owner, setOwner] = useState("");
  const participants = [...new Set(meeting.segments.map((item) => item.speaker))];
  return (
    <Modal title="Review transcript turn" onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        const segmentId = turn.id;
        if (kind === "speaker") onSave({ kind, segmentId, speaker });
        else if (kind === "action") onSave({ kind, segmentId, title, owner });
        else onSave({ kind, segmentId, title });
      }}>
        <div className="modal-body">
          <blockquote className="correction-evidence">
            <strong>{turn.speaker} · {time(turn.start)}</strong>
            <p>{turn.text}</p>
          </blockquote>
          <label className="field">
            Correction
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="decision">Add decision</option>
              <option value="action">Add action item</option>
              <option value="speaker">Correct speaker</option>
            </select>
          </label>
          {kind === "speaker" ? (
            <label className="field">
              Speaker name
              <input required maxLength={120} value={speaker} onChange={(e) => setSpeaker(e.target.value)} />
              <span className="field-hint">Applies to this turn. Edit action owners separately.</span>
            </label>
          ) : (
            <label className="field">
              Title
              <input required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
          )}
          {kind === "action" && (
            <label className="field">
              Owner
              <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Unassigned</option>
                {participants.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="text-button" onClick={onCopy}>Copy evidence link</button>
          <button type="button" className="button" disabled={busy} onClick={onClose}>Cancel</button>
          <button className="button primary" disabled={busy || (kind === "speaker"
            ? !speaker.trim() || speaker.trim() === turn.speaker : !title.trim())}>
            {kind === "speaker" ? "Save speaker" : kind === "action" ? "Add action item" : "Add decision"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MergeDraftModal({
  item, targets, busy, error, onClose, onSave,
}: {
  item: Decision | Action;
  targets: (Decision | Action)[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (keepId: string) => void;
}) {
  const [keepId, setKeepId] = useState("");
  return (
    <Modal title="Merge duplicate" onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!busy && keepId) onSave(keepId);
      }}>
        <div className="modal-body">
          <p className="modal-intro">Move the evidence from <strong>{item.title}</strong> into the draft you keep. Review the merged draft again before publishing.</p>
          <label className="field">
            Draft to keep
            <select required value={keepId} onChange={(e) => setKeepId(e.target.value)}>
              <option value="">Select a draft</option>
              {targets.map((target) => <option key={target.id} value={target.id}>{target.title}</option>)}
            </select>
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="button" disabled={busy} onClick={onClose}>Cancel</button>
          <button className="button primary" disabled={busy || !keepId}>Merge drafts</button>
        </div>
      </form>
    </Modal>
  );
}

function EditDecisionModal({
  item,
  meeting,
  onClose,
  onSave,
  onMerge,
  busy,
  error,
}: {
  item: Decision;
  meeting: Meeting;
  onClose: () => void;
  onSave: (d: Decision) => void;
  onMerge?: () => void;
  busy: boolean;
  error: string;
}) {
  const [draft, setDraft] = useState({ ...item });
  return (
    <Modal title="Edit decision" onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
      >
        <div className="modal-body">
          {(["title", "context", "rationale", "consequences"] as const).map(
            (field) => (
              <label className="field" key={field}>
                {field[0].toUpperCase() + field.slice(1)}
                {field === "title" ? (
                  <input
                    required
                    maxLength={300}
                    value={draft[field]}
                    onChange={(e) =>
                      setDraft({ ...draft, [field]: e.target.value })
                    }
                  />
                ) : (
                  <textarea
                    rows={3}
                    maxLength={4000}
                    value={draft[field]}
                    onChange={(e) =>
                      setDraft({ ...draft, [field]: e.target.value })
                    }
                  />
                )}
              </label>
            ),
          )}
          <p className="field-hint">
            Evidence preserved:{" "}
            {item.evidence
              .map((id) =>
                time(meeting.segments.find((s) => s.id === id)!.start),
              )
              .join(", ")}
            . Saving returns this output to draft.
          </p>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {onMerge && <button type="button" className="text-button" disabled={busy} onClick={onMerge}>Merge duplicate</button>}
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Check size={15} />
            )}
            Save decision
          </button>
        </div>
      </form>
    </Modal>
  );
}
function EditActionModal({
  item,
  meeting,
  onClose,
  onSave,
  onMerge,
  busy,
  error,
}: {
  item: Action;
  meeting: Meeting;
  onClose: () => void;
  onSave: (a: Action) => void;
  onMerge?: () => void;
  busy: boolean;
  error: string;
}) {
  const [draft, setDraft] = useState({ ...item });
  return (
    <Modal title="Edit action item" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
      >
        <div className="modal-body">
          <label className="field">
            Title
            <input
              required
              maxLength={300}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="field">
            Description
            <textarea
              rows={4}
              maxLength={4000}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          <label className="field">
            Owner
            <select
              value={draft.owner}
              onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
            >
              <option value="">Unassigned</option>
              {draft.owner && !meeting.segments.some((s) => s.speaker === draft.owner) && (
                <option value={draft.owner}>{draft.owner}</option>
              )}
              {Array.from(new Set(meeting.segments.map((s) => s.speaker))).map(
                (n) => (
                  <option key={n}>{n}</option>
                ),
              )}
            </select>
          </label>
          <div className="form-grid">
            <label className="field">
              Priority
              <select
                value={draft.priority}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    priority: e.target.value as Action["priority"],
                  })
                }
              >
                {["High", "Medium", "Low"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Due date
              <input
                type="date"
                value={draft.due}
                onChange={(e) => setDraft({ ...draft, due: e.target.value })}
              />
            </label>
          </div>
          <p className="field-hint">
            Leave the due date empty when no deadline was agreed.
          </p>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {onMerge && <button type="button" className="text-button" disabled={busy} onClick={onMerge}>Merge duplicate</button>}
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            <Check size={15} />
            Save action item
          </button>
        </div>
      </form>
    </Modal>
  );
}
function IssueDeliveryRecovery({ delivery, revision, disabled, onUpdate }: {
  delivery: Delivery;
  revision: number;
  disabled: boolean;
  onUpdate: (delivery: Delivery) => void;
}) {
  const [result, setResult] = useState<{ message: string; canRetry: boolean }>();
  const [busy, setBusy] = useState<"check" | "retry" | "">("");
  if (delivery.destination !== "linear" && delivery.destination !== "github") return null;
  if (delivery.status === "sent" && !result) return null;
  const provider = names[delivery.destination];
  async function recover(action: "check" | "retry") {
    setBusy(action);
    setResult(undefined);
    try {
      const data = await requestJson<{ message: string; canRetry: boolean; deliveries: Delivery[] }>(
        "/api/publish/recover", {
          method: "POST",
          body: JSON.stringify({ deliveryId: delivery.id, revision, action }),
        },
      );
      const updated = data.deliveries.find((item) => item.id === delivery.id);
      if (updated) onUpdate(updated);
      setResult({ message: data.message, canRetry: data.canRetry });
    } catch (error) {
      setResult({ message: (error as Error).message, canRetry: false });
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="issue-recovery">
      {result && <p role="status">{result.message}</p>}
      {delivery.status !== "sent" && (
        <div className="issue-recovery-actions">
          <button type="button" className="button" disabled={disabled || !!busy}
            onClick={() => recover("check")}>
            {busy === "check" ? "Checking…" : delivery.followupOf ? "Check Linear status" : `Check ${provider}`}
          </button>
          {(result?.canRetry || busy === "retry") && (
            <button type="button" className="button" disabled={disabled || !!busy}
              onClick={() => recover("retry")}>
              {busy === "retry" ? "Retrying…" : delivery.followupOf ? "Retry status update" : "Retry issue"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PublishModal({
  meeting: m,
  connections,
  deliveries,
  busy,
  onClose,
  itemIds,
  onToggle,
  onPublish,
  onCopy,
  onDeliveryUpdate,
}: {
  meeting: Meeting;
  connections: IntegrationStatus;
  deliveries: Delivery[];
  busy: boolean;
  onClose: () => void;
  itemIds?: string[];
  onToggle: (itemId: string, approved: boolean) => Promise<void>;
  onPublish: (d: Destination[]) => Promise<{
    sent: number;
    skipped: number;
    remaining: number;
    deliveries: Delivery[];
  }>;
  onCopy: () => void;
  onDeliveryUpdate: (delivery: Delivery) => void;
}) {
  const [destinations, setDestinations] = useState<Destination[]>([]),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      sent: number;
      skipped: number;
      remaining: number;
      deliveries: Delivery[];
    } | null>(null);
  const items = [...m.decisions, ...m.actions].filter((item) => !itemIds || itemIds.includes(item.id));
  const approved = items.filter((item) => item.approved).length;
  const hasActions = items.some((item) => "owner" in item && !item.linearFollowup);
  const hasFollowups = items.some((item) => "owner" in item && item.linearFollowup?.kind === "issue");
  const hasDecisions = items.some((item) => !("owner" in item));
  const related = deliveries.filter(
    (d) => d.meetingId === m.id && (!itemIds || itemIds.includes(d.itemId)),
  );
  return (
    <Modal
      title="Publish outputs"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="modal-body">
        <p className="modal-intro">Approve the drafts you want to send, then choose a destination. Issues can be assigned after creation.</p>
        <div className="publish-items">
          {items.map((item) => (
            <label className="publish-item" key={item.id}>
              <input type="checkbox" checked={item.approved} disabled={busy}
                onChange={(e) => onToggle(item.id, e.target.checked)} />
              <span><strong>{item.title}</strong><small>{"owner" in item && item.linearFollowup?.kind === "issue"
                ? `${item.linearFollowup.identifier} · ${item.linearFollowup.status ? linearStatusLabels[item.linearFollowup.status] : "Keep existing issue"}`
                : "owner" in item ? "Action item" : "Decision"}</small></span>
            </label>
          ))}
        </div>
        {m.source === "sample" ? (
          <div className="inline-note">
            <Sparkles size={18} />
            <p>
              This is a fictional sample meeting. Try the review flow and export
              a summary. Import a real transcript to publish to your team.
            </p>
          </div>
        ) : (
          <>
            <h3 className="form-section-title">Choose where the work goes</h3>
            {(
              [
                "linear",
                "github",
                "jira",
                "trello",
                "slack",
                "notion",
                "webhook",
              ] as Destination[]
            ).filter((dest) => dest === "linear" ? hasActions || hasFollowups : ["github", "jira", "trello"].includes(dest) ? hasActions
              : dest === "notion" ? hasDecisions : !itemIds).map((dest) => (
              <label
                className={`destination-row ${!connections[dest] ? "disabled" : ""}`}
                key={dest}
              >
                <AppIcon id={dest} />
                <span>
                  <strong>{names[dest]}</strong>
                  <small>
                    {dest === "slack" || dest === "webhook"
                      ? "A summary of approved outputs"
                      : dest === "linear" && hasFollowups
                        ? hasActions ? "Create new issues and apply approved status updates" : "Apply approved updates to existing issues"
                      : dest === "notion"
                        ? "An ADR page for each accepted decision"
                        : dest === "trello" ? "A card for each approved action"
                          : "An issue for each approved action · Assign later"}
                  </small>
                </span>
                {connections[dest] ? (
                  <input
                    type="checkbox"
                    checked={destinations.includes(dest)}
                    onChange={(e) =>
                      setDestinations((prev) =>
                        e.target.checked
                          ? [...prev, dest]
                          : prev.filter((x) => x !== dest),
                      )
                    }
                  />
                ) : (
                  <span className="muted">Not connected</span>
                )}
              </label>
            ))}
          </>
        )}
        <div className="publish-safety">
          <ShieldCheck size={14} />
          Previous deliveries are skipped. Uncertain outcomes are held for
          review.
        </div>
        {related.length > 0 && (
          <div className="publish-results">
            {related.map((d) => (
              <div key={d.id}>
                <span
                  className={`tiny-dot ${d.status === "sent" ? "green-dot" : "amber-dot"}`}
                />
                <div>
                  {names[d.destination]} ·{" "}
                  {d.itemId === "summary"
                    ? "Meeting summary"
                    : m.actions.find((a) => a.id === d.itemId)?.title ||
                      m.decisions.find((a) => a.id === d.itemId)?.title}
                  <small>
                    {d.status === "sent"
                      ? "Published"
                      : d.status === "pending"
                        ? "Pending — check destination before any manual retry"
                        : d.error ||
                          "Outcome uncertain — reconcile before retrying"}
                  </small>
                  <IssueDeliveryRecovery delivery={d} revision={m.revision} disabled={busy}
                    onUpdate={onDeliveryUpdate} />
                </div>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noreferrer">
                    {d.destination === "linear" || d.destination === "github" ? "Open & assign" : "Open"}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        {result && (
          <p role="status" className="success-text">
            {result.sent} published. {result.skipped} previous deliveries
            skipped.{" "}
            {result.remaining > 0 &&
              `${result.remaining} remain. Publish again to continue.`}
          </p>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="button" onClick={onCopy} disabled={!approved}>
          <Copy size={14} />
          Copy summary
        </button>
        {m.source !== "sample" && (
          <button
            className="button primary"
            disabled={busy || !destinations.length || !approved}
            onClick={async () => {
              setError("");
              try {
                setResult(await onPublish(destinations));
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <ArrowRight size={15} />
            )}
            Publish approved outputs
          </button>
        )}
      </div>
    </Modal>
  );
}
