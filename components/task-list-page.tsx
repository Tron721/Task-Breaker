"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type TaskStatus = "NOW" | "NEXT" | "LATER" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type RecurrenceType = "NONE" | "DAILY" | "WEEKLY";
type WeeklyDay = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

type TaskSummary = {
  id: string;
  title: string;
  objective: string;
  isComplete: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  scheduledFor: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalSteps: number;
  completeSteps: number;
  template?: {
    id: string;
    name: string;
  } | null;
};

type TodayResponse = {
  date: string;
  summary: {
    total: number;
    done: number;
    remaining: number;
    focus: number;
    queued: number;
    completionPercent: number;
    overdue: number;
  };
  groups: {
    now: TaskSummary[];
    next: TaskSummary[];
    later: TaskSummary[];
    done: TaskSummary[];
  };
  overdue: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    priority: TaskPriority;
  }>;
};

type ReminderItem = {
  id: string;
  title: string;
  reminderAt: string;
  status: TaskStatus;
  priority: TaskPriority;
};

type Template = {
  id: string;
  name: string;
  objective: string;
  priority: TaskPriority;
  estimatedMinutes: number | null;
  recurrence: RecurrenceType;
  weeklyDays: string | null;
  reminderHour: number | null;
  reminderMinute: number | null;
  timezone: string;
  isActive: boolean;
  lastGeneratedOn: string | null;
  steps: Array<{
    id: string;
    text: string;
    position: number;
  }>;
};

type ReviewResult = {
  summary: {
    totalTasks: number;
    completedTasks: number;
    rolledTasks: number;
    completedSteps: number;
    totalSteps: number;
    completionPercent: number;
  };
  digest: string[];
};

const WEEKDAYS: WeeklyDay[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDatePayload(value: string): string {
  return new Date(`${value}T09:00:00`).toISOString();
}

function toDateTimePayload(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function formatShortDate(value?: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function recurrenceLabel(template: Template): string {
  if (template.recurrence === "DAILY") {
    return "Daily";
  }
  if (template.recurrence === "WEEKLY") {
    return template.weeklyDays ? `Weekly (${template.weeklyDays})` : "Weekly";
  }
  return "Manual";
}

function priorityChipClass(priority: TaskPriority) {
  return priority === "CRITICAL" || priority === "HIGH" ? "chip warning" : "chip neutral";
}

export function TaskListPage() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [todayData, setTodayData] = useState<TodayResponse | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [submittingTemplate, setSubmittingTemplate] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(todayInputValue());

  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [status, setStatus] = useState<TaskStatus>("NEXT");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [scheduledFor, setScheduledFor] = useState(todayInputValue());
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [reminderAt, setReminderAt] = useState("");

  const [templateName, setTemplateName] = useState("");
  const [templateObjective, setTemplateObjective] = useState("");
  const [templatePriority, setTemplatePriority] = useState<TaskPriority>("MEDIUM");
  const [templateEstimatedMinutes, setTemplateEstimatedMinutes] = useState("");
  const [templateRecurrence, setTemplateRecurrence] = useState<RecurrenceType>("DAILY");
  const [templateDays, setTemplateDays] = useState<WeeklyDay[]>(["MON", "TUE", "WED", "THU", "FRI"]);
  const [templateReminderHour, setTemplateReminderHour] = useState("9");
  const [templateReminderMinute, setTemplateReminderMinute] = useState("0");
  const [templateStepsText, setTemplateStepsText] = useState("");

  const todayCounts = useMemo(() => {
    return todayData?.summary ?? { total: 0, done: 0, remaining: 0, focus: 0, queued: 0, completionPercent: 0, overdue: 0 };
  }, [todayData]);

  const completedTaskCount = useMemo(() => tasks.filter((task) => task.isComplete).length, [tasks]);
  const totalSteps = useMemo(() => tasks.reduce((sum, task) => sum + task.totalSteps, 0), [tasks]);
  const completeSteps = useMemo(() => tasks.reduce((sum, task) => sum + task.completeSteps, 0), [tasks]);

  async function fetchTasks() {
    const response = await fetch("/api/tasks", { cache: "no-store" });
    const payload = (await response.json()) as { tasks?: TaskSummary[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load tasks.");
    }
    setTasks(payload.tasks ?? []);
  }

  async function fetchToday() {
    const response = await fetch(`/api/workflow/today?date=${selectedDate}`, { cache: "no-store" });
    const payload = (await response.json()) as TodayResponse & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load today workflow.");
    }
    setTodayData(payload);
  }

  async function fetchTemplates() {
    const response = await fetch("/api/templates", { cache: "no-store" });
    const payload = (await response.json()) as { templates?: Template[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load templates.");
    }
    setTemplates(payload.templates ?? []);
  }

  async function fetchReminders() {
    const response = await fetch("/api/workflow/reminders?windowMinutes=180", { cache: "no-store" });
    const payload = (await response.json()) as { reminders?: ReminderItem[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load reminders.");
    }
    setReminders(payload.reminders ?? []);
  }

  async function refreshAll() {
    setError(null);
    await Promise.all([fetchTasks(), fetchToday(), fetchTemplates(), fetchReminders()]);
  }

  useEffect(() => {
    setLoading(true);
    void refreshAll()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function patchTask(taskId: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to update task.");
    }
  }

  async function onCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!objective.trim()) {
      setError("Please enter an objective.");
      return;
    }

    setSubmittingTask(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          objective: objective.trim(),
          status,
          priority,
          scheduledFor: scheduledFor ? toDatePayload(scheduledFor) : null,
          dueDate: dueDate ? toDatePayload(dueDate) : null,
          estimatedMinutes: estimatedMinutes ? Number.parseInt(estimatedMinutes, 10) : null,
          reminderAt: toDateTimePayload(reminderAt),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create task.");
      }

      setTitle("");
      setObjective("");
      setStatus("NEXT");
      setPriority("MEDIUM");
      setScheduledFor(selectedDate);
      setDueDate("");
      setEstimatedMinutes("");
      setReminderAt("");
      setInfo("Task created and planned.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setSubmittingTask(false);
    }
  }

  async function onGenerateRecurring() {
    setSyncing(true);
    setError(null);
    setInfo(null);
    try {
      const response = await fetch("/api/workflow/materialize-recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: toDatePayload(selectedDate),
        }),
      });

      const payload = (await response.json()) as { error?: string; createdCount?: number };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate recurring tasks.");
      }

      setInfo(`Generated ${payload.createdCount ?? 0} recurring task(s) for ${selectedDate}.`);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate recurring tasks.");
    } finally {
      setSyncing(false);
    }
  }

  async function onRunReview() {
    setSyncing(true);
    setError(null);
    setInfo(null);
    try {
      const response = await fetch("/api/workflow/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: toDatePayload(selectedDate),
        }),
      });
      const payload = (await response.json()) as ReviewResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to run daily review.");
      }
      setReviewResult(payload);
      setInfo("Daily review completed.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run daily review.");
    } finally {
      setSyncing(false);
    }
  }

  async function onSetTaskStatus(task: TaskSummary, nextStatus: TaskStatus) {
    try {
      await patchTask(task.id, { status: nextStatus });
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task status.");
    }
  }

  async function onToggleTask(task: TaskSummary) {
    try {
      await patchTask(task.id, { isComplete: !task.isComplete });
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle task.");
    }
  }

  async function onMoveToToday(taskId: string, statusValue: TaskStatus = "NEXT") {
    try {
      await patchTask(taskId, { scheduledFor: toDatePayload(selectedDate), status: statusValue === "LATER" ? "NEXT" : statusValue });
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move task to today.");
    }
  }

  async function onCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const parsedSteps = templateStepsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!templateObjective.trim() || !templateName.trim()) {
      setError("Template name and objective are required.");
      return;
    }

    if (parsedSteps.length === 0) {
      setError("Provide at least one template step.");
      return;
    }

    setSubmittingTemplate(true);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          objective: templateObjective.trim(),
          priority: templatePriority,
          estimatedMinutes: templateEstimatedMinutes ? Number.parseInt(templateEstimatedMinutes, 10) : null,
          recurrence: templateRecurrence,
          weeklyDays: templateRecurrence === "WEEKLY" ? templateDays : undefined,
          reminderHour: templateReminderHour ? Number.parseInt(templateReminderHour, 10) : null,
          reminderMinute: templateReminderMinute ? Number.parseInt(templateReminderMinute, 10) : null,
          steps: parsedSteps.map((text) => ({ text })),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create template.");
      }

      setTemplateName("");
      setTemplateObjective("");
      setTemplatePriority("MEDIUM");
      setTemplateEstimatedMinutes("");
      setTemplateRecurrence("DAILY");
      setTemplateDays(["MON", "TUE", "WED", "THU", "FRI"]);
      setTemplateReminderHour("9");
      setTemplateReminderMinute("0");
      setTemplateStepsText("");
      setInfo("Template created.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template.");
    } finally {
      setSubmittingTemplate(false);
    }
  }

  async function onInstantiateTemplate(template: Template) {
    setSyncing(true);
    setError(null);
    setInfo(null);
    try {
      const response = await fetch(`/api/templates/${template.id}/instantiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: toDatePayload(selectedDate),
          status: "NEXT",
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to instantiate template.");
      }
      setInfo(`Instantiated "${template.name}" for ${selectedDate}.`);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to instantiate template.");
    } finally {
      setSyncing(false);
    }
  }

  async function onToggleTemplate(template: Template) {
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update template.");
      }
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update template.");
    }
  }

  function toggleTemplateDay(day: WeeklyDay) {
    setTemplateDays((previous) => {
      if (previous.includes(day)) {
        return previous.filter((item) => item !== day);
      }
      return [...previous, day];
    });
  }

  const todayBuckets = todayData?.groups ?? { now: [], next: [], later: [], done: [] };

  return (
    <main className="page-shell page-enter stack">
      <section className="panel hero stack">
        <span className="badge">Daily Workflow</span>
        <h1 className="hero-title">Task Breaker Daily Operating System</h1>
        <p className="hero-subtitle">Start with recurring work, focus with Now/Next/Later, close day with rollover + digest.</p>
        <div className="kpi-grid">
          <article className="kpi-card">
            <span className="kpi-label">Today Tasks</span>
            <strong>{todayCounts.total}</strong>
          </article>
          <article className="kpi-card">
            <span className="kpi-label">Focus (Now)</span>
            <strong>{todayCounts.focus}</strong>
          </article>
          <article className="kpi-card">
            <span className="kpi-label">Done Today</span>
            <strong>{todayCounts.completionPercent}%</strong>
          </article>
          <article className="kpi-card">
            <span className="kpi-label">Overdue</span>
            <strong>{todayCounts.overdue}</strong>
          </article>
        </div>
      </section>

      <section className="grid two">
        <article className="panel stack">
          <h2 className="section-title">Morning Setup</h2>
          <p className="section-subtitle">Kickoff date, generate recurring tasks, and refresh reminders.</p>
          <div className="grid three-up">
            <label className="stack label-stack small">
              <span>Working date</span>
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>
            <div className="stack">
              <span className="small muted">Recurring</span>
              <button className="secondary" type="button" onClick={() => void onGenerateRecurring()} disabled={syncing || loading}>
                Generate for day
              </button>
            </div>
            <div className="stack">
              <span className="small muted">End of day</span>
              <button className="secondary" type="button" onClick={() => void onRunReview()} disabled={syncing || loading}>
                Run daily review
              </button>
            </div>
          </div>

          <div className="row wrap">
            <button className="primary" type="button" onClick={() => void refreshAll()} disabled={loading || syncing}>
              Refresh dashboard
            </button>
            <span className="small muted">{loading ? "Loading..." : `${reminders.length} reminders in next 3 hours`}</span>
          </div>

          {reviewResult ? (
            <div className="stack">
              <h3 className="section-title">Daily Digest</h3>
              <p className="small muted" style={{ margin: 0 }}>
                {reviewResult.summary.completedTasks}/{reviewResult.summary.totalTasks} tasks done, {reviewResult.summary.rolledTasks} rolled.
              </p>
              <ul className="plain-list small">
                {reviewResult.digest.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>

        <article className="panel stack">
          <h2 className="section-title">Quick Capture</h2>
          <p className="section-subtitle">Drop work in fast with default scheduling and priority.</p>
          <form className="stack" onSubmit={onCreateTask}>
            <label className="stack label-stack small">
              <span>Title (optional)</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Finalize client deck" />
            </label>
            <label className="stack label-stack small">
              <span>Objective</span>
              <textarea rows={4} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="What should happen and why?" />
            </label>
            <div className="grid two-up">
              <label className="stack label-stack small">
                <span>Status</span>
                <select className="select-input" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
                  <option value="NOW">Now</option>
                  <option value="NEXT">Next</option>
                  <option value="LATER">Later</option>
                  <option value="DONE">Done</option>
                </select>
              </label>
              <label className="stack label-stack small">
                <span>Priority</span>
                <select className="select-input" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </label>
            </div>
            <div className="grid three-up">
              <label className="stack label-stack small">
                <span>Scheduled day</span>
                <input type="date" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
              </label>
              <label className="stack label-stack small">
                <span>Due day</span>
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </label>
              <label className="stack label-stack small">
                <span>Est. minutes</span>
                <input type="number" min={1} max={1440} value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} />
              </label>
            </div>
            <label className="stack label-stack small">
              <span>Reminder (optional)</span>
              <input type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} />
            </label>
            <button className="primary" disabled={submittingTask} type="submit">
              {submittingTask ? "Creating..." : "Create + Generate Steps"}
            </button>
          </form>
        </article>
      </section>

      <section className="panel stack">
        <div className="row spread wrap">
          <div className="stack" style={{ gap: "0.2rem" }}>
            <h2 className="section-title">Today Queue</h2>
            <p className="section-subtitle">{selectedDate}</p>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Remaining {todayCounts.remaining}
          </p>
        </div>

        <div className="bucket-grid">
          {(["now", "next", "later", "done"] as const).map((bucket) => (
            <article key={bucket} className="bucket-column">
              <h3 className="bucket-title">{bucket.toUpperCase()}</h3>
              <div className="stack">
                {todayBuckets[bucket].map((task) => (
                  <div key={task.id} className={`task-card ${task.isComplete ? "complete" : ""}`}>
                    <div className="row spread wrap task-toolbar">
                      <span className={`chip ${task.isComplete ? "success" : "neutral"}`}>{task.status}</span>
                      <span className={priorityChipClass(task.priority)}>{task.priority}</span>
                    </div>
                    <strong className="task-title">{task.title}</strong>
                    <p className="task-objective-preview small muted">{task.objective}</p>
                    <p className="task-meta small muted">
                      {task.completeSteps}/{task.totalSteps} steps • Due {formatShortDate(task.dueDate)}
                    </p>
                    <div className="row wrap">
                      <Link href={`/tasks/${task.id}`} className="link-btn">
                        Open
                      </Link>
                      <select className="select-input slim" value={task.status} onChange={(event) => void onSetTaskStatus(task, event.target.value as TaskStatus)}>
                        <option value="NOW">Now</option>
                        <option value="NEXT">Next</option>
                        <option value="LATER">Later</option>
                        <option value="DONE">Done</option>
                      </select>
                      <label className="row small">
                        <input type="checkbox" checked={task.isComplete} onChange={() => void onToggleTask(task)} />
                        Done
                      </label>
                    </div>
                  </div>
                ))}
                {todayBuckets[bucket].length === 0 ? <p className="small muted">No tasks.</p> : null}
              </div>
            </article>
          ))}
        </div>

        {todayData?.overdue && todayData.overdue.length > 0 ? (
          <div className="stack">
            <h3 className="section-title">Overdue</h3>
            {todayData.overdue.map((task) => (
              <div key={task.id} className="row spread wrap overdue-row">
                <span className="small">
                  {task.title} ({task.priority}) due {formatShortDate(task.dueDate)}
                </span>
                  <button className="secondary" type="button" onClick={() => void onMoveToToday(task.id)}>
                    Move to today
                  </button>
                </div>
              ))}
          </div>
        ) : null}
      </section>

      <section className="grid two">
        <article className="panel stack">
          <h2 className="section-title">Recurring Templates</h2>
          <p className="section-subtitle">Create daily/weekly templates and instantiate on demand.</p>

          <form className="stack" onSubmit={onCreateTemplate}>
            <label className="stack label-stack small">
              <span>Template name</span>
              <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Example: Morning pipeline check" />
            </label>
            <label className="stack label-stack small">
              <span>Objective</span>
              <textarea rows={3} value={templateObjective} onChange={(event) => setTemplateObjective(event.target.value)} placeholder="Desired outcome when this template runs." />
            </label>
            <div className="grid three-up">
              <label className="stack label-stack small">
                <span>Priority</span>
                <select className="select-input" value={templatePriority} onChange={(event) => setTemplatePriority(event.target.value as TaskPriority)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </label>
              <label className="stack label-stack small">
                <span>Recurrence</span>
                <select className="select-input" value={templateRecurrence} onChange={(event) => setTemplateRecurrence(event.target.value as RecurrenceType)}>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="NONE">Manual</option>
                </select>
              </label>
              <label className="stack label-stack small">
                <span>Est. minutes</span>
                <input type="number" min={1} max={1440} value={templateEstimatedMinutes} onChange={(event) => setTemplateEstimatedMinutes(event.target.value)} />
              </label>
            </div>

            {templateRecurrence === "WEEKLY" ? (
              <div className="row wrap">
                {WEEKDAYS.map((day) => (
                  <label key={day} className="row small day-checkbox">
                    <input type="checkbox" checked={templateDays.includes(day)} onChange={() => toggleTemplateDay(day)} />
                    {day}
                  </label>
                ))}
              </div>
            ) : null}

            <div className="grid two-up">
              <label className="stack label-stack small">
                <span>Reminder hour</span>
                <input type="number" min={0} max={23} value={templateReminderHour} onChange={(event) => setTemplateReminderHour(event.target.value)} />
              </label>
              <label className="stack label-stack small">
                <span>Reminder minute</span>
                <input type="number" min={0} max={59} value={templateReminderMinute} onChange={(event) => setTemplateReminderMinute(event.target.value)} />
              </label>
            </div>

            <label className="stack label-stack small">
              <span>Template steps (one per line)</span>
              <textarea rows={4} value={templateStepsText} onChange={(event) => setTemplateStepsText(event.target.value)} placeholder={"Open analytics dashboard\nReview blockers\nCommit next action"} />
            </label>

            <button className="primary" disabled={submittingTemplate} type="submit">
              {submittingTemplate ? "Creating..." : "Create template"}
            </button>
          </form>
        </article>

        <aside className="panel stack">
          <h2 className="section-title">Template Library</h2>
          <p className="section-subtitle">{templates.length} template(s)</p>

          <div className="stack">
            {templates.map((template) => (
              <article key={template.id} className="task-card">
                <div className="row spread wrap">
                  <strong className="task-title">{template.name}</strong>
                  <span className={`chip ${template.isActive ? "success" : "neutral"}`}>{template.isActive ? "Active" : "Paused"}</span>
                </div>
                <p className="task-objective-preview small muted">{template.objective}</p>
                <p className="task-meta small muted">
                  {recurrenceLabel(template)} • {template.steps.length} steps • Last generated {formatShortDate(template.lastGeneratedOn)}
                </p>
                <div className="row wrap">
                  <button className="secondary" type="button" onClick={() => void onInstantiateTemplate(template)} disabled={syncing || loading}>
                    Instantiate for day
                  </button>
                  <button className="secondary" type="button" onClick={() => void onToggleTemplate(template)}>
                    {template.isActive ? "Pause" : "Activate"}
                  </button>
                </div>
              </article>
            ))}
            {templates.length === 0 ? <p className="small muted">No templates yet.</p> : null}
          </div>
        </aside>
      </section>

      <section className="panel stack">
        <div className="row spread wrap">
          <h2 className="section-title">All Tasks</h2>
          <p className="small muted" style={{ margin: 0 }}>
            {completedTaskCount}/{tasks.length} complete • {completeSteps}/{totalSteps} steps complete
          </p>
        </div>
        <div className="stack task-list">
          {tasks.map((task) => (
            <article key={task.id} className={`task-card ${task.isComplete ? "complete" : ""}`}>
              <div className="row spread wrap">
                <div className="row wrap">
                  <span className={`chip ${task.isComplete ? "success" : "neutral"}`}>{task.status}</span>
                  <span className={priorityChipClass(task.priority)}>{task.priority}</span>
                </div>
                <div className="task-actions">
                  <Link href={`/tasks/${task.id}`} className="link-btn">
                    Open
                  </Link>
                </div>
              </div>
              <strong className="task-title">{task.title}</strong>
              <p className="task-objective-preview small muted">{task.objective}</p>
              <p className="task-meta small muted">
                Scheduled {formatShortDate(task.scheduledFor)} • Due {formatShortDate(task.dueDate)} • Updated {formatShortDate(task.updatedAt)}
              </p>
            </article>
          ))}
          {tasks.length === 0 ? <p className="muted">No tasks yet.</p> : null}
        </div>
      </section>

      {info ? <p className="warning">{info}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
