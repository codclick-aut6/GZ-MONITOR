import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { loadWebhookUrl, postToWebhook } from "@/lib/webhook";
import {
  isHumanRequest,
  playAlertSound,
  requestNotificationPermission,
  showDesktopNotification,
  unlockAudio,
} from "@/lib/attendant-alert";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  SENDER_LABEL,
  STATUS_LABEL,
  type SessionStatus,
  type WhatsappMessage,
  type WhatsappSession,
} from "@/lib/whatsapp-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { acknowledgeSessionRead, contactUnreadCount, sessionStatusPatch } from "@/lib/unread-messages";
import { assumeConversationAndNotify, conversationHistory, type ConversationHistoryItem, type SessionAssignmentEvent } from "@/lib/session-events";
import { SessionAssignmentNotice } from "@/components/session-assignment-notice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GoodZap Monitor — Conversas do WhatsApp em tempo real" },
      {
        name: "description",
        content:
          "Monitore em tempo real as conversas entre clientes, a IA e atendentes humanos no WhatsApp, com controle de transbordo humano.",
      },
      { property: "og:title", content: "GoodZap Monitor — Conversas do WhatsApp em tempo real" },
      {
        property: "og:description",
        content:
          "Monitore em tempo real as conversas entre clientes, a IA e atendentes humanos no WhatsApp, com controle de transbordo humano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

// The generated Database types predate these tables, so table queries are cast.
/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

const STATUS_STYLE: Record<SessionStatus, string> = {
  active: "bg-chart-2/15 text-chart-2",
  paused: "bg-chart-4/15 text-chart-4",
  closed: "bg-muted text-muted-foreground",
};

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

type Period = "hoje" | "ontem" | "7d" | "all";
type AssignFilter = "mine" | "queue" | "all";

const ASSIGN_LABEL: Record<AssignFilter, string> = {
  mine: "Minhas",
  queue: "Fila",
  all: "Todas",
};

// Contact-list width: drag handle + persisted preference
const SIDEBAR_LS_KEY = "gzap-sidebar-width";
const SIDEBAR_MIN = 300;
const SIDEBAR_MAX = 640;
const SIDEBAR_DEFAULT = 380;
const SIDEBAR_GUTTER = 420; // keep room for the conversation panel

const PERIOD_LABEL: Record<Period, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "7d": "Últimos 7 dias",
  all: "Todas",
};

function inPeriod(iso: string, period: Period) {
  if (period === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (period === "hoje") return d.toDateString() === now.toDateString();
  if (period === "ontem") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  }
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return d.getTime() >= start.getTime();
}

function Dashboard() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sessions, setSessions] = useState<WhatsappSession[]>([]);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [sessionEvents, setSessionEvents] = useState<SessionAssignmentEvent[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimingSessionId, setClaimingSessionId] = useState<string | null>(null);
  const claimingRef = useRef(false);
  const [period, setPeriod] = useState<Period>("all");
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [assignFilter, setAssignFilter] = useState<AssignFilter>("all");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [humanAlerts, setHumanAlerts] = useState<WhatsappSession[]>([]);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const sidebarWidthRef = useRef(SIDEBAR_DEFAULT);
  const resizingRef = useRef(false);
  const sessionsRef = useRef<WhatsappSession[]>([]);
  const sessionsRequestRef = useRef(0);
  const refreshMessagesRef = useRef<(() => Promise<void>) | null>(null);

  const applySidebarWidth = useCallback((w: number) => {
    const max = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, window.innerWidth - SIDEBAR_GUTTER));
    const next = Math.round(Math.min(Math.max(w, SIDEBAR_MIN), max));
    sidebarWidthRef.current = next;
    setSidebarWidth(next);
  }, []);

  const saveSidebarWidth = useCallback(() => {
    try {
      window.localStorage.setItem(SIDEBAR_LS_KEY, String(sidebarWidthRef.current));
    } catch {
      // storage unavailable: the width still applies to this session
    }
  }, []);

  const resetSidebarWidth = useCallback(() => {
    applySidebarWidth(SIDEBAR_DEFAULT);
    saveSidebarWidth();
  }, [applySidebarWidth, saveSidebarWidth]);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(SIDEBAR_LS_KEY));
    if (Number.isFinite(stored) && stored > 0) applySidebarWidth(stored);
  }, [applySidebarWidth]);

  useEffect(() => {
    const onResize = () => applySidebarWidth(sidebarWidthRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [applySidebarWidth]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Auth gate (client-side; dashboard data is protected by RLS)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth" });
      } else {
        setUserId(data.user.id);
        const { data: profs } = await db.from("profiles").select("id, name, email");
        const map: Record<string, string> = {};
        for (const p of (profs ?? []) as { id: string; name: string | null; email: string | null }[]) {
          map[p.id] = p.name || p.email || "Atendente";
        }
        setProfiles(map);
        setCheckingAuth(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadSessions = useCallback(async () => {
    const requestId = ++sessionsRequestRef.current;
    const { data, error } = await db
      .from("whatsapp_sessions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (requestId !== sessionsRequestRef.current) return;
    setSessionsError(error ? "Não foi possível carregar as conversas. Tente novamente." : null);
    if (data) setSessions(data as WhatsappSession[]);
  }, []);

  useEffect(() => {
    if (checkingAuth) return;
    loadSessions();
    loadWebhookUrl();

    const channel = supabase
      .channel("whatsapp-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_sessions" }, (payload) => {
        const next = payload.new as WhatsappSession | undefined;
        const prev = payload.old as Partial<WhatsappSession> | undefined;
        const prevLocal = sessionsRef.current.find((s) => s.id === next?.id);
        const wasRequest = isHumanRequest(prevLocal ?? (prev?.status ? (prev as WhatsappSession) : null));
        if (next && isHumanRequest(next) && !wasRequest) {
          const name = next.contact_name || next.contact_phone;
          setHumanAlerts((a) => (a.some((x) => x.id === next.id) ? a : [...a, next]));
          playAlertSound();
          showDesktopNotification("Cliente pediu um atendente", name, () => {
            setSelectedPhone(next.contact_phone);
            setSelectedSessionId(next.session_id);
          });
        }
        if (next && !isHumanRequest(next)) setHumanAlerts((a) => a.filter((x) => x.id !== next.id));
        loadSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkingAuth, loadSessions]);

  // Unlock audio + ask notification permission on first interaction
  useEffect(() => {
    const handler = () => {
      unlockAudio();
      requestNotificationPermission();
    };
    window.addEventListener("pointerdown", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const filteredSessions = useMemo(
    () =>
      sessions.filter(
        (s) =>
          (period === "all" || inPeriod(s.created_at, period)) &&
          (assignFilter === "all" ||
            (assignFilter === "mine" && s.assigned_to === userId && s.status !== "closed") ||
            (assignFilter === "queue" && !s.assigned_to && s.status !== "closed")),
      ),
    [sessions, period, assignFilter, userId],
  );

  const assignCounts = useMemo(
    () => ({
      mine: sessions.filter((s) => s.assigned_to === userId && s.status !== "closed").length,
      queue: sessions.filter((s) => !s.assigned_to && s.status !== "closed").length,
    }),
    [sessions, userId],
  );

  // Group sessions by contact phone
  const contacts = useMemo(() => {
    const map = new Map<string, WhatsappSession[]>();
    for (const s of filteredSessions) {
      const list = map.get(s.contact_phone) ?? [];
      list.push(s);
      map.set(s.contact_phone, list);
    }
    return [...map.entries()].map(([phone, list]) => ({
      phone,
      name: list.find((s) => s.contact_name)?.contact_name ?? null,
      sessions: list.sort((a, b) => b.created_at.localeCompare(a.created_at)),
      lastActivity: list.reduce((max, s) => (s.updated_at > max ? s.updated_at : max), ""),
    }));
  }, [filteredSessions]).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));

  const selectedContact = contacts.find((c) => c.phone === selectedPhone) ?? null;
  const activeSession =
    selectedContact?.sessions.find((s) => s.id === selectedSessionId || s.session_id === selectedSessionId) ??
    selectedContact?.sessions[0] ??
    null;

  // Show only the 5 most recent sessions in the tabs; "todas" reveals the rest.
  const visibleSessions = useMemo(() => {
    if (!selectedContact) return [] as WhatsappSession[];
    if (showAllSessions) return selectedContact.sessions;
    const top = selectedContact.sessions.slice(0, 5);
    if (activeSession && !top.some((s) => s.id === activeSession.id)) top.push(activeSession);
    return top;
  }, [selectedContact, showAllSessions, activeSession]);

  useEffect(() => {
    setShowAllSessions(false);
  }, [selectedPhone]);


  const activeSessionKey = activeSession?.session_id;
  const activeUnread = activeSession?.unread_count ?? 0;
  useEffect(() => {
    if (checkingAuth || !activeSessionKey) return;
    let cancelled = false;
    let requestId = 0;
    setMessages([]);
    setSessionEvents([]);
    setEventsError(null);
    setMessagesError(null);
    setReadError(null);
    setLoadingMessages(true);

    async function refreshMessages() {
      if (!activeSessionKey) return;
      const currentRequest = ++requestId;
      const observedUnread = sessionsRef.current.find((s) => s.session_id === activeSessionKey)?.unread_count ?? 0;
      const items: WhatsappMessage[] = [];
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await db.from("whatsapp_messages")
          .select("*")
          .eq("session_id", activeSessionKey)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (cancelled || currentRequest !== requestId) return;
        if (error) {
          setMessagesError("Não foi possível carregar as mensagens. Tente novamente.");
          setLoadingMessages(false);
          return;
        }
        const batch = (data ?? []) as WhatsappMessage[];
        items.push(...batch);
        if (batch.length < pageSize) break;
      }
      // Internal events are stored separately from customer messages and never sent to WhatsApp.
      const events: SessionAssignmentEvent[] = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase.from("whatsapp_session_events")
          .select("*")
          .eq("session_id", activeSessionKey)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (cancelled || currentRequest !== requestId) return;
        if (error) {
          setEventsError("Não foi possível carregar os avisos da equipe.");
          break;
        }
        const batch = (data ?? []) as SessionAssignmentEvent[];
        events.push(...batch);
        if (batch.length < pageSize) {
          setSessionEvents(events);
          setEventsError(null);
          break;
        }
      }
      if (cancelled || currentRequest !== requestId) return;
      setMessages(items);
      setMessagesError(null);
      setLoadingMessages(false);

      // Persist only after the selected history loads, never merely on selection.
      if (document.visibilityState !== "visible") return;
      try {
        const savedUnread = await acknowledgeSessionRead(supabase, activeSessionKey, observedUnread);
        if (cancelled || currentRequest !== requestId) return;
        setReadError(null);
        if (savedUnread === null) {
          if (observedUnread > 0) void loadSessions();
          return;
        }
        // Prevent an older session-list fetch from restoring the previous count.
        ++sessionsRequestRef.current;
        setSessions((prev) => prev.map((s) =>
          s.session_id === activeSessionKey && s.unread_count === observedUnread
            ? { ...s, unread_count: savedUnread }
            : s,
        ));
        void loadSessions();
      } catch {
        if (cancelled || currentRequest !== requestId) return;
        setReadError("Não foi possível salvar a leitura. Tente novamente.");
      }
    }

    refreshMessagesRef.current = refreshMessages;
    const channel = supabase.channel(`whatsapp-messages-${activeSessionKey}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "whatsapp_messages",
        filter: `session_id=eq.${activeSessionKey}`,
      }, () => { void refreshMessages(); })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "whatsapp_session_events",
        filter: `session_id=eq.${activeSessionKey}`,
      }, () => { void refreshMessages(); })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refreshMessages();
      });
    void refreshMessages();
    // Keep messages current even when a browser loses its live connection.
    const timer = window.setInterval(() => { void refreshMessages(); }, 15000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadSessions();
        void refreshMessages();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      refreshMessagesRef.current = null;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [checkingAuth, activeSessionKey, loadSessions]);

  useEffect(() => {
    if (activeUnread > 0) void refreshMessagesRef.current?.();
  }, [activeUnread]);

  // Messages of the selected session, grouped by day
  const sessionMessages = useMemo(() => {
    if (!activeSession) return [];
    const history = conversationHistory(activeSession.session_id, messages, sessionEvents);
    const groups: { day: string; items: ConversationHistoryItem[] }[] = [];
    for (const item of history) {
      const day = formatDay(item.value.created_at);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(item);
      else groups.push({ day, items: [item] });
    }
    return groups;
  }, [messages, sessionEvents, activeSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sessionEvents.length, selectedSessionId, selectedPhone]);

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
    } catch {
      const el = document.createElement("textarea");
      el.value = phone;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopiedPhone(phone);
    window.setTimeout(() => setCopiedPhone((p) => (p === phone ? null : p)), 1500);
  }

  async function updateStatus(session: WhatsappSession, status: SessionStatus) {
    const patch = sessionStatusPatch(status, new Date().toISOString());
    const { error } = await db.from("whatsapp_sessions").update(patch).eq("id", session.id);
    if (error) {
      setReadError("Não foi possível atualizar a conversa. Tente novamente.");
      return;
    }
    setReadError(null);
    await loadSessions();
  }

  async function claimSession(session: WhatsappSession) {
    if (!userId || claimingRef.current) return false;
    claimingRef.current = true;
    setClaimingSessionId(session.id);
    setClaimError(null);
    try {
      const { notificationError } = await assumeConversationAndNotify(
        supabase, session, userId, profiles[userId] || null, new Date().toISOString(), postToWebhook,
      );
      setClaimError(notificationError);
      setHumanAlerts((alerts) => alerts.filter((s) => s.id !== session.id));
      await loadSessions();
      await refreshMessagesRef.current?.();
      return true;
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : "Não foi possível assumir a conversa. Tente novamente.");
      await loadSessions();
      return false;
    } finally {
      claimingRef.current = false;
      setClaimingSessionId(null);
    }
  }

  async function releaseSession(session: WhatsappSession, backToAi = false) {
    const patch: Record<string, unknown> = { assigned_to: null, updated_at: new Date().toISOString() };
    if (backToAi) {
      patch["status"] = "active";
      patch["paused_reason"] = null;
    }
    await db.from("whatsapp_sessions").update(patch).eq("id", session.id);
    loadSessions();
  }

  async function sendHumanMessage() {
    if (!draft.trim() || !activeSession || sending) return;
    setSending(true);
    const text = draft.trim();
    const { data: inserted } = await db
      .from("whatsapp_messages")
      .insert({
        session_id: activeSession.session_id,
        contact_phone: activeSession.contact_phone,
        sender_type: "human",
        content: text,
        sender_user_id: userId,
      })
      .select("id")
      .single();
    const { data: userData } = await supabase.auth.getUser();
    try {
      await postToWebhook({
        event: "human_message_sent",
        contact_phone: activeSession.contact_phone,
        contact_name: activeSession.contact_name ?? null,
        message: text,
        session_id: activeSession.session_id,
        message_id: inserted?.id ?? null,
        sender_type: "human",
        sender_email: userData.user?.email ?? null,
        sender_name: (userId && profiles[userId]) || null,
        name:
          (activeSession.assigned_to && profiles[activeSession.assigned_to]) ||
          (userId && profiles[userId]) ||
          null,
        timestamp: new Date().toISOString(),
      });
      setSendError(null);
    } catch {
      setSendError(
        "Mensagem registrada, mas o envio ao WhatsApp falhou. Verifique o webhook em Configurações.",
      );
    }
    setDraft("");
    setSending(false);
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-chart-2" />
          <h1 className="text-lg font-bold text-foreground">GoodZap Monitor</h1>
          <span className="hidden text-xs text-muted-foreground sm:inline">tempo real</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            aria-label="Configurações"
            title="Configurações"
            className="rounded-md border border-input p-1.5 text-foreground transition-colors hover:bg-accent"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-md border border-input px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
          >
            Sair
          </button>
        </div>
      </header>

      {claimError && (
        <div role="alert" className="border-b border-border bg-card px-4 py-2 text-xs text-destructive">
          {claimError}
        </div>
      )}

      {humanAlerts.length > 0 && (
        <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
          {humanAlerts.map((s) => (
            <div key={s.id} className="animate-in slide-in-from-right rounded-lg border-2 border-destructive bg-card p-3 shadow-lg">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                Cliente pediu um atendente
              </div>
              <p className="mt-1 truncate text-sm text-foreground">{s.contact_name || s.contact_phone}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  disabled={claimingSessionId !== null}
                  onClick={async () => {
                    setSelectedPhone(s.contact_phone);
                    setSelectedSessionId(s.session_id);
                    await claimSession(s);
                  }}
                >
                  {claimingSessionId === s.id ? "Assumindo..." : "Assumir conversa agora"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setHumanAlerts((a) => a.filter((x) => x.id !== s.id))}>
                  Dispensar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {/* Contact list */}
        <aside
          style={{ "--sidebar-w": `${sidebarWidth}px` } as CSSProperties}
          className={cn("w-full shrink-0 overflow-y-auto bg-card md:w-[var(--sidebar-w)]", selectedPhone && "hidden md:block")}
        >
          <div className="sticky top-0 z-10 border-b border-border bg-card px-3 py-2">
            <div className="mb-2 grid grid-cols-3 gap-1 rounded-md bg-secondary p-0.5">
              {(Object.keys(ASSIGN_LABEL) as AssignFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setAssignFilter(f)}
                  className={cn(
                    "rounded px-2 py-1 text-xs font-medium transition-colors",
                    assignFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f === "queue" && humanAlerts.length > 0 && (
                    <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-destructive align-middle" />
                  )}
                  {ASSIGN_LABEL[f]}
                  {f !== "all" && <span className="ml-1 text-[10px] opacity-70">{assignCounts[f]}</span>}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent",
                  )}
                >
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-medium text-muted-foreground">
              {contacts.length} {contacts.length === 1 ? "conversa" : "conversas"} em{" "}
              <span className="text-foreground">{PERIOD_LABEL[period]}</span>
            </p>
          </div>
          {sessionsError ? (
            <div className="p-4" role="alert">
              <p className="text-sm text-destructive">{sessionsError}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadSessions}>Tentar novamente</Button>
            </div>
          ) : contacts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {sessions.length > 0 && period !== "all"
                ? "Nenhuma conversa no período selecionado."
                : "Nenhuma conversa ainda. Quando o n8n gravar mensagens, elas aparecem aqui automaticamente."}
            </p>
          ) : (
            contacts.map((c) => (
              <div
                key={c.phone}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedPhone(c.phone);
                  setSelectedSessionId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedPhone(c.phone);
                    setSelectedSessionId(null);
                  }
                }}
                className={cn(
                  "block w-full cursor-pointer border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent",
                  selectedPhone === c.phone && "bg-accent",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15px] leading-snug font-semibold text-foreground">
                    {c.name ?? c.phone}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      STATUS_STYLE[c.sessions[0]?.status ?? "active"],
                    )}
                  >
                    {STATUS_LABEL[c.sessions[0]?.status ?? "active"]}
                  </span>
                  {c.sessions.some((s) => isHumanRequest(s)) && (
                    <span className="shrink-0 animate-pulse rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                      ⚠ Pediu atendente
                    </span>
                  )}
                  {(() => {
                    const n = contactUnreadCount(c.sessions);
                    return n > 0 ? (
                      <span
                        aria-label={`${n} mensagens não lidas`}
                        className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground"
                      >
                        {n > 9 ? "9+" : n}
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="mt-1 text-[11px]">
                  <span className={c.sessions[0]?.assigned_to === userId ? "font-medium text-chart-2" : "text-muted-foreground"}>
                    {c.sessions[0]?.assigned_to
                      ? c.sessions[0].assigned_to === userId
                        ? "Com você"
                        : `Com ${profiles[c.sessions[0].assigned_to] ?? "atendente"}`
                      : "Na fila"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  {c.name && (
                    <span className="min-w-0 flex-1 truncate text-[13px] tabular-nums text-muted-foreground">{c.phone}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyPhone(c.phone);
                    }}
                    className={cn(
                      "shrink-0 rounded-md border border-input px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-accent",
                      copiedPhone === c.phone ? "text-chart-2" : "text-muted-foreground",
                    )}
                  >
                    {copiedPhone === c.phone ? "Copiado!" : "Copiar Telefone"}
                  </button>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {c.sessions.length} sessão(ões) · {formatDay(c.lastActivity)}
                </p>
              </div>
            ))
          )}
        </aside>

        {/* Drag handle: adjusts the contact-list width (double-click to reset) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Arraste para ajustar a largura da lista de conversas"
          aria-valuenow={sidebarWidth}
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          title="Arraste para ajustar a largura"
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            resizingRef.current = true;
          }}
          onPointerMove={(e) => {
            if (resizingRef.current) applySidebarWidth(e.clientX);
          }}
          onPointerUp={(e) => {
            if (!resizingRef.current) return;
            resizingRef.current = false;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
            saveSidebarWidth();
          }}
          onPointerCancel={() => {
            resizingRef.current = false;
          }}
          onDoubleClick={resetSidebarWidth}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 48 : 16;
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              applySidebarWidth(sidebarWidthRef.current + (e.key === "ArrowRight" ? step : -step));
              saveSidebarWidth();
            }
          }}
          className="hidden w-1.5 shrink-0 cursor-col-resize touch-none bg-border/70 transition-colors hover:bg-primary/60 focus-visible:bg-primary/70 focus-visible:outline-none md:block"
        />

        {/* Conversation panel */}
        <main className={cn("min-w-0 flex-1 flex-col", selectedPhone ? "flex" : "hidden md:flex")}>
          {!selectedContact ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Selecione um contato para ver a conversa.
              </p>
            </div>
          ) : (
            <>
              {/* Session tabs + status controls */}
              <div className="border-b border-border bg-card px-4 py-2">
                <Button variant="ghost" size="sm" className="mb-2 md:hidden" onClick={() => setSelectedPhone(null)}>← Conversas</Button>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {visibleSessions.map((s) => (
                      <Button
                        size="sm"
                        variant={activeSession?.id === s.id ? "default" : "secondary"}
                        key={s.id}
                        onClick={() => setSelectedSessionId(s.id)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs transition-colors",
                          activeSession?.id === s.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-accent",
                        )}
                      >
                        {formatDay(s.created_at)} · {formatTime(s.created_at)}
                      </Button>
                    ))}
                    {selectedContact.sessions.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setShowAllSessions((v) => !v)}
                        className="self-center px-1 text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {showAllSessions ? "mostrar menos" : `todas (${selectedContact.sessions.length})`}
                      </button>
                    )}

                  </div>
                  {activeSession && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          STATUS_STYLE[activeSession.status],
                        )}
                      >
                        {STATUS_LABEL[activeSession.status]}
                      </span>
                      {isHumanRequest(activeSession) && (
                        <span className="animate-pulse rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                          ⚠ Pediu atendente
                        </span>
                      )}
                      {activeSession.status !== "closed" && activeSession.assigned_to !== userId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={claimingSessionId !== null}
                          onClick={() => claimSession(activeSession)}
                          className="rounded-md bg-chart-4/15 px-2.5 py-1 text-xs font-medium text-chart-4 transition-colors hover:bg-chart-4/25"
                        >
                          {claimingSessionId === activeSession.id ? "Assumindo..." : activeSession.assigned_to ? "Assumir de " + (profiles[activeSession.assigned_to] ?? "outro") : "Assumir conversa"}
                        </Button>
                      )}
                      {activeSession.assigned_to === userId && activeSession.status !== "closed" && (
                        <button
                          onClick={() => releaseSession(activeSession)}
                          className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
                        >
                          Devolver à fila
                        </button>
                      )}
                      {activeSession.status === "paused" && activeSession.assigned_to === userId && (
                        <button
                          onClick={() => releaseSession(activeSession, true)}
                          className="rounded-md bg-chart-2/15 px-2.5 py-1 text-xs font-medium text-chart-2 transition-colors hover:bg-chart-2/25"
                        >
                          Devolver à IA
                        </button>
                      )}
                      {activeSession.status !== "closed" && (
                        <button
                          onClick={() => updateStatus(activeSession, "closed")}
                          className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                        >
                          Encerrar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              {eventsError && (
                <div role="alert" className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
                  <p className="text-xs text-destructive">{eventsError}</p>
                  <Button variant="outline" size="sm" onClick={() => { void refreshMessagesRef.current?.(); }}>
                    Tentar novamente
                  </Button>
                </div>
              )}
              {readError && (
                <div role="alert" className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
                  <p className="text-xs text-destructive">{readError}</p>
                  <Button variant="outline" size="sm" onClick={() => { void refreshMessagesRef.current?.(); }}>
                    Tentar novamente
                  </Button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {sessionMessages.length === 0 ? (
                  <p role={messagesError ? "alert" : "status"} className={cn("text-center text-sm", messagesError ? "text-destructive" : "text-muted-foreground")}>
                    {loadingMessages ? "Carregando mensagens..." : messagesError ?? "Nenhuma mensagem nesta sessão."}
                  </p>
                ) : (
                  sessionMessages.map((group) => (
                    <div key={group.day}>
                      <div className="my-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {group.day}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      {group.items.map((item) => {
                        if (item.kind === "assignment") {
                          return <SessionAssignmentNotice key={`assignment-${item.value.id}`} event={item.value} />;
                        }
                        const m = item.value;
                        // Mensagens gravadas pelo webhook como 'human' sem atendente
                        // identificado são, na verdade, mensagens do cliente.
                        const isContact =
                          m.sender_type === "contact" ||
                          (m.sender_type === "human" && !m.sender_user_id);
                        const label = isContact ? SENDER_LABEL.contact : SENDER_LABEL[m.sender_type];
                        return (
                        <div
                          key={m.id}
                          className={cn(
                            "mb-2 flex",
                            isContact ? "justify-start" : "justify-end",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] break-words rounded-2xl px-3.5 py-2 md:max-w-[70%]",
                              isContact &&
                                "rounded-bl-sm bg-secondary text-secondary-foreground",
                              m.sender_type === "ai" &&
                                "rounded-br-sm bg-primary text-primary-foreground",
                              m.sender_type === "human" &&
                                !isContact &&
                                "rounded-br-sm bg-chart-2 text-primary-foreground",
                            )}
                          >
                            {(() => {
                              const md = (m.metadata ?? {}) as Record<string, unknown>;
                              const url = typeof md["media_url"] === "string" ? md["media_url"] : typeof md["url"] === "string" ? md["url"] : null;
                              const mime = typeof md["mime_type"] === "string" ? md["mime_type"] : "";
                              const t = typeof md["type"] === "string" ? md["type"] : mime.split("/")[0];
                              if (!url) return null;
                              if (t === "image" || t === "sticker")
                                return (
                                  <a href={url} target="_blank" rel="noreferrer" className="mb-1 block">
                                    <img src={url} alt="Imagem enviada" loading="lazy" className="max-h-72 w-full rounded-xl object-cover" />
                                  </a>
                                );
                              if (t === "audio" || t === "ptt" || t === "voice")
                                return <audio controls src={url} className="mb-1 w-64 max-w-full" />;
                              if (t === "video")
                                return <video controls src={url} className="mb-1 max-h-72 w-full rounded-xl" />;
                              return (
                                <a href={url} target="_blank" rel="noreferrer" className="mb-1 block text-sm underline">
                                  📎 {typeof md["filename"] === "string" ? md["filename"] : "Abrir arquivo"}
                                </a>
                              );
                            })()}
                            {m.content && <p className="whitespace-pre-wrap text-sm">{m.content}</p>}
                            <p
                              className={cn(
                                "mt-1 text-right text-[10px]",
                                isContact
                                  ? "text-muted-foreground"
                                  : "text-primary-foreground/70",
                              )}
                            >
                              {label} · {formatTime(m.created_at)}
                            </p>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Someone else owns this conversation */}
              {activeSession && activeSession.status !== "closed" && activeSession.assigned_to && activeSession.assigned_to !== userId && (
                <div className="border-t border-border bg-card p-3 text-center text-xs text-muted-foreground">
                  Esta conversa está sendo atendida por{" "}
                  <span className="font-medium text-foreground">{profiles[activeSession.assigned_to] ?? "outro atendente"}</span>.
                </div>
              )}

              {/* Human reply box */}
              {activeSession && activeSession.status === "paused" && activeSession.assigned_to === userId && (
                <div className="border-t border-border bg-card p-3">
                  <div className="flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendHumanMessage();
                        }
                      }}
                      placeholder="Responder como atendente humano..."
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={sendHumanMessage}
                      disabled={sending || !draft.trim()}
                      className="rounded-md bg-chart-2 px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-chart-2/90 disabled:opacity-50"
                    >
                      Enviar
                    </button>
                  </div>
                  {sendError && (
                    <p role="alert" className="mt-1.5 text-[11px] text-destructive">
                      {sendError}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    A IA está pausada nesta sessão. Suas mensagens são registradas como atendente e
                    enviadas ao WhatsApp via webhook.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
