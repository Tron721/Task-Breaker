"use client";

import Link from "next/link";
import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type TaskStatus = "NOW" | "NEXT" | "LATER" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Step = {
  id: string;
  taskId: string;
  text: string;
  position: number;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

type TaskMessage = {
  id: string;
  taskId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type Task = {
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
  completedAt: string | null;
  reviewNotes: string | null;
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps: Step[];
  messages: TaskMessage[];
  template?: {
    id: string;
    name: string;
  } | null;
};

type SuggestedStep = {
  text: string;
};

function formatShortDate(value?: string | null): string {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function toDateInput(value?: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeInput(value?: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toDateTimePayload(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function toDayPayload(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T09:00:00`).toISOString();
}

function SortableStepItem(props: {
  step: Step;
  onToggle: (step: Step) => Promise<void>;
  onDelete: (step: Step) => Promise<void>;
  onSaveText: (step: Step, text: string) => Promise<void>;
}) {
  const { step, onToggle, onDelete, onSaveText } = props;
  const [draftText, setDraftText] = useState(step.text);
  const [savingText, setSavingText] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  useEffect(() => {
    setDraftText(step.text);
  }, [step.text]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  async function saveText() {
    if (!draftText.trim() || draftText.trim() === step.text) {
      return;
    }

    setSavingText(true);
    try {
      await onSaveText(step, draftText.trim());
    } finally {
      setSavingText(false);
    }
  }

  return (
    <div ref={setNodeRef} style={style} className={`step-row stack ${step.isComplete ? "is-complete" : ""}`}>
      <div className="row spread wrap step-header">
        <div className="row step-header-left">
          <button className="drag-handle" type="button" aria-label="Drag step" {...attributes} {...listeners}>
            <span />
            <span />
            <span />
          </button>
          <label className="row small" style={{ fontWeight: 600 }}>
            <input aria-label="Toggle step complete" checked={step.isComplete} onChange={() => void onToggle(step)} type="checkbox" />
            {step.isComplete ? "Done" : "Open"}
          </label>
        </div>
        <span className="small muted">Step {step.position + 1}</span>
      </div>

      <div className="row step-input-row">
        <textarea className="step-textarea" rows={3} value={draftText} onChange={(event) => setDraftText(event.target.value)} aria-label="Step text" />
      </div>

      <div className="row wrap step-actions">
        <button className="secondary" onClick={() => void saveText()} disabled={savingText} type="button">
          Save
        </button>
        <button className="danger" onClick={() => void onDelete(step)} type="button">
          Delete
        </button>
      </div>
    </div>
  );
}

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [objectiveDraft, setObjectiveDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<TaskStatus>("NEXT");
  const [priorityDraft, setPriorityDraft] = useState<TaskPriority>("MEDIUM");
  const [scheduledForDraft, setScheduledForDraft] = useState("");
  const [dueDateDraft, setDueDateDraft] = useState("");
  const [estimatedMinutesDraft, setEstimatedMinutesDraft] = useState("");
  const [actualMinutesDraft, setActualMinutesDraft] = useState("");
  const [reviewNotesDraft, setReviewNotesDraft] = useState("");
  const [reminderAtDraft, setReminderAtDraft] = useState("");

  const [newStepText, setNewStepText] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatModelUsed, setChatModelUsed] = useState<string | null>(null);
  const [suggestedSteps, setSuggestedSteps] = useState<SuggestedStep[] | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function hydrateTask(nextTask: Task) {
    const sortedSteps = [...nextTask.steps].sort((a, b) => a.position - b.position);
    const hydrated = { ...nextTask, steps: sortedSteps };
    setTask(hydrated);
    setTitleDraft(hydrated.title);
    setObjectiveDraft(hydrated.objective);
    setStatusDraft(hydrated.status);
    setPriorityDraft(hydrated.priority);
    setScheduledForDraft(toDateInput(hydrated.scheduledFor));
    setDueDateDraft(toDateInput(hydrated.dueDate));
    setEstimatedMinutesDraft(hydrated.estimatedMinutes ? String(hydrated.estimatedMinutes) : "");
    setActualMinutesDraft(hydrated.actualMinutes ? String(hydrated.actualMinutes) : "");
    setReviewNotesDraft(hydrated.reviewNotes ?? "");
    setReminderAtDraft(toDateTimeInput(hydrated.reminderAt));
  }

  async function loadTask() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
      const payload = (await response.json()) as { task?: Task; error?: string };

      if (!response.ok || !payload.task) {
        throw new Error(payload.error ?? "Failed to load task.");
      }

      hydrateTask(payload.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTask();
  }, [taskId]);

  const stepProgress = useMemo(() => {
    if (!task) {
      return { label: "", complete: 0, total: 0, percent: 0 };
    }

    const complete = task.steps.filter((step) => step.isComplete).length;
    const total = task.steps.length;
    const percent = total === 0 ? 0 : Math.round((complete / total) * 100);

    return {
      label: `${complete}/${total} completed`,
      complete,
      total,
      percent,
    };
  }, [task]);

  async function patchTask(body: Record<string, unknown>) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as { task?: Task; error?: string };
    if (!response.ok || !payload.task) {
      throw new Error(payload.error ?? "Task update failed.");
    }

    hydrateTask(payload.task);
  }

  async function onToggleTask() {
    if (!task) return;
    setSaving(true);
    setError(null);

    try {
      await patchTask({ isComplete: !task.isComplete });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle task.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveTaskDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task) return;

    setSaving(true);
    setError(null);

    try {
      await patchTask({
        title: titleDraft.trim() || task.title,
        objective: objectiveDraft.trim() || task.objective,
        status: statusDraft,
        priority: priorityDraft,
        scheduledFor: toDayPayload(scheduledForDraft),
        dueDate: toDayPayload(dueDateDraft),
        estimatedMinutes: estimatedMinutesDraft ? Number.parseInt(estimatedMinutesDraft, 10) : null,
        actualMinutes: actualMinutesDraft ? Number.parseInt(actualMinutesDraft, 10) : null,
        reminderAt: toDateTimePayload(reminderAtDraft),
        reviewNotes: reviewNotesDraft.trim() ? reviewNotesDraft.trim() : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task details.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleStep(step: Step) {
    setError(null);
    try {
      const response = await fetch(`/api/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete: !step.isComplete }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to toggle step.");
      }
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle step.");
    }
  }

  async function onSaveStepText(step: Step, text: string) {
    setError(null);
    try {
      const response = await fetch(`/api/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update step text.");
      }
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update step text.");
    }
  }

  async function onDeleteStep(step: Step) {
    setError(null);
    try {
      const response = await fetch(`/api/steps/${step.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete step.");
      }
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete step.");
    }
  }

  async function onAddStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newStepText.trim()) return;

    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newStepText.trim() }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add step.");
      }
      setNewStepText("");
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add step.");
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    if (!task) return;

    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = task.steps.findIndex((step) => step.id === active.id);
    const newIndex = task.steps.findIndex((step) => step.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const optimistic = arrayMove(task.steps, oldIndex, newIndex).map((step, index) => ({
      ...step,
      position: index,
    }));

    setTask({ ...task, steps: optimistic });

    try {
      const response = await fetch(`/api/tasks/${taskId}/reorder-steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedStepIds: optimistic.map((step) => step.id) }),
      });

      const payload = (await response.json()) as { steps?: Step[]; error?: string };
      const reorderedSteps = payload.steps;

      if (!response.ok || !reorderedSteps) {
        throw new Error(payload.error ?? "Failed to reorder steps.");
      }

      setTask((previous) =>
        previous
          ? {
              ...previous,
              steps: [...reorderedSteps].sort((a, b) => a.position - b.position),
            }
          : previous,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder steps.");
      await loadTask();
    }
  }

  async function onSendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatInput.trim() || !task) {
      return;
    }

    setSendingChat(true);
    setError(null);

    const userMessage = chatInput.trim();

    try {
      const response = await fetch(`/api/tasks/${taskId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const payload = (await response.json()) as {
        error?: string;
        modelUsed?: string;
        suggestedSteps?: SuggestedStep[];
        messages?: TaskMessage[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send chat message.");
      }

      setTask((previous) =>
        previous
          ? {
              ...previous,
              messages: [...previous.messages, ...(payload.messages ?? [])],
            }
          : previous,
      );
      setSuggestedSteps(payload.suggestedSteps ?? []);
      setChatModelUsed(payload.modelUsed ?? null);
      setChatInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send chat message.");
    } finally {
      setSendingChat(false);
    }
  }

  async function onApplySuggestions() {
    if (!suggestedSteps || suggestedSteps.length === 0 || !task) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/apply-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: suggestedSteps }),
      });

      const payload = (await response.json()) as { steps?: Step[]; error?: string };

      if (!response.ok || !payload.steps) {
        throw new Error(payload.error ?? "Failed to apply suggested steps.");
      }

      setTask({
        ...task,
        isComplete: false,
        status: "NEXT",
        steps: [...payload.steps].sort((a, b) => a.position - b.position),
      });
      setStatusDraft("NEXT");
      setSuggestedSteps(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply suggested steps.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page-shell page-enter stack">
        <section className="panel stack">
          <p className="muted" style={{ margin: 0 }}>
            Loading task...
          </p>
        </section>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="page-shell page-enter stack">
        <section className="panel stack">
          <Link href="/" className="link-btn">
            Back to tasks
          </Link>
          <p className="error">Task not found.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-enter stack">
      <section className="panel hero stack">
        <div className="row spread wrap">
          <div className="row wrap">
            <Link href="/" className="link-btn">
              Back to tasks
            </Link>
            <a href={`/tasks/${task.id}`} target="_blank" rel="noreferrer" className="link-btn">
              Open in new tab
            </a>
          </div>
          <label className="row small" style={{ fontWeight: 700 }}>
            <input checked={task.isComplete} onChange={() => void onToggleTask()} type="checkbox" />
            Task complete
          </label>
        </div>

        <h1 className="hero-title">{task.title}</h1>
        <p className="hero-subtitle">{task.objective}</p>
        <div className="row wrap">
          <span className={`chip ${task.isComplete ? "success" : "neutral"}`}>{task.status}</span>
          <span className="chip neutral">Priority {task.priority}</span>
          {task.template ? <span className="chip neutral">Template {task.template.name}</span> : null}
        </div>
        <div className="progress-track" aria-label="Step completion progress">
          <span className="progress-fill" style={{ width: `${stepProgress.percent}%` }} />
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          {stepProgress.label} • Scheduled {formatShortDate(task.scheduledFor)} • Updated {formatShortDate(task.updatedAt)}
        </p>
      </section>

      <section className="grid two">
        <article className="panel stack">
          <h2 className="section-title">Task Details</h2>

          <form className="stack" onSubmit={onSaveTaskDetails}>
            <label className="stack label-stack small">
              <span>Title</span>
              <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
            </label>
            <label className="stack label-stack small">
              <span>Objective</span>
              <textarea rows={3} value={objectiveDraft} onChange={(event) => setObjectiveDraft(event.target.value)} />
            </label>

            <div className="grid two-up">
              <label className="stack label-stack small">
                <span>Status</span>
                <select className="select-input" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as TaskStatus)}>
                  <option value="NOW">Now</option>
                  <option value="NEXT">Next</option>
                  <option value="LATER">Later</option>
                  <option value="DONE">Done</option>
                </select>
              </label>
              <label className="stack label-stack small">
                <span>Priority</span>
                <select className="select-input" value={priorityDraft} onChange={(event) => setPriorityDraft(event.target.value as TaskPriority)}>
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
                <input type="date" value={scheduledForDraft} onChange={(event) => setScheduledForDraft(event.target.value)} />
              </label>
              <label className="stack label-stack small">
                <span>Due day</span>
                <input type="date" value={dueDateDraft} onChange={(event) => setDueDateDraft(event.target.value)} />
              </label>
              <label className="stack label-stack small">
                <span>Reminder</span>
                <input type="datetime-local" value={reminderAtDraft} onChange={(event) => setReminderAtDraft(event.target.value)} />
              </label>
            </div>

            <div className="grid two-up">
              <label className="stack label-stack small">
                <span>Estimated minutes</span>
                <input type="number" min={1} max={1440} value={estimatedMinutesDraft} onChange={(event) => setEstimatedMinutesDraft(event.target.value)} />
              </label>
              <label className="stack label-stack small">
                <span>Actual minutes</span>
                <input type="number" min={0} max={1440} value={actualMinutesDraft} onChange={(event) => setActualMinutesDraft(event.target.value)} />
              </label>
            </div>

            <label className="stack label-stack small">
              <span>Review notes</span>
              <textarea rows={3} value={reviewNotesDraft} onChange={(event) => setReviewNotesDraft(event.target.value)} />
            </label>

            <div className="row wrap">
              <button className="primary" type="submit" disabled={saving}>
                Save details
              </button>
              <button className="secondary" onClick={() => void loadTask()} type="button">
                Refresh
              </button>
            </div>
          </form>

          <hr style={{ width: "100%", border: 0, borderTop: "1px solid var(--border)", margin: "0.25rem 0" }} />

          <div className="stack">
            <div className="row spread wrap">
              <h2 className="section-title">Steps</h2>
              <span className="small muted">
                {stepProgress.complete}/{stepProgress.total} completed
              </span>
            </div>

            <form className="add-step-form" onSubmit={onAddStep}>
              <input className="add-step-input" value={newStepText} onChange={(event) => setNewStepText(event.target.value)} placeholder="Add a new step" />
              <button className="secondary" type="submit">
                Add
              </button>
            </form>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={task.steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
                <div className="stack steps-list">
                  {task.steps.map((step) => (
                    <SortableStepItem key={step.id} step={step} onToggle={onToggleStep} onDelete={onDeleteStep} onSaveText={onSaveStepText} />
                  ))}
                  {task.steps.length === 0 ? <p className="muted">No steps yet.</p> : null}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </article>

        <aside className="panel stack">
          <div className="row spread wrap">
            <h2 className="section-title">Planner Chat</h2>
            {chatModelUsed ? <span className="small muted">Model: {chatModelUsed}</span> : null}
          </div>

          <div className="chat-log">
            {task.messages.length === 0 ? <p className="muted small">No messages yet.</p> : null}
            {task.messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <strong className="small message-role">{message.role}</strong>
                <p className="small message-content">{message.content}</p>
              </div>
            ))}
          </div>

          <form className="stack" onSubmit={onSendChat}>
            <textarea rows={4} value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask to refine, split, simplify, or reorder the plan" />
            <button className="primary" disabled={sendingChat} type="submit">
              {sendingChat ? "Sending..." : "Send"}
            </button>
          </form>

          {suggestedSteps && suggestedSteps.length > 0 ? (
            <div className="stack">
              <h3 className="section-title">Suggested Step Update</h3>
              <ol className="small suggestion-list">
                {suggestedSteps.map((step, index) => (
                  <li key={`${index}-${step.text}`}>{step.text}</li>
                ))}
              </ol>
              <button className="secondary" onClick={() => void onApplySuggestions()} disabled={saving} type="button">
                Apply suggested steps
              </button>
            </div>
          ) : null}
        </aside>
      </section>

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
