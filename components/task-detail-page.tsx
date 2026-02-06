"use client";

import Link from "next/link";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState, type FormEvent } from "react";

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
  createdAt: string;
  updatedAt: string;
  steps: Step[];
  messages: TaskMessage[];
};

type SuggestedStep = {
  text: string;
};

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
    <div ref={setNodeRef} style={style} className="step-row stack">
      <div className="row spread">
        <div className="row" style={{ alignItems: "flex-start", flex: 1 }}>
          <input
            aria-label="Toggle step complete"
            checked={step.isComplete}
            onChange={() => void onToggle(step)}
            type="checkbox"
            style={{ marginTop: "0.35rem" }}
          />
          <input
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            aria-label="Step text"
          />
        </div>

        <div className="row">
          <button className="secondary" onClick={() => void saveText()} disabled={savingText} type="button">
            Save
          </button>
          <button className="danger" onClick={() => void onDelete(step)} type="button">
            Delete
          </button>
          <button className="secondary" type="button" {...attributes} {...listeners}>
            Drag
          </button>
        </div>
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
  const [newStepText, setNewStepText] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatModelUsed, setChatModelUsed] = useState<string | null>(null);
  const [suggestedSteps, setSuggestedSteps] = useState<SuggestedStep[] | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function loadTask() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
      const payload = (await response.json()) as { task?: Task; error?: string };

      if (!response.ok || !payload.task) {
        throw new Error(payload.error ?? "Failed to load task.");
      }

      const sortedSteps = [...payload.task.steps].sort((a, b) => a.position - b.position);
      const nextTask = { ...payload.task, steps: sortedSteps };
      setTask(nextTask);
      setTitleDraft(nextTask.title);
      setObjectiveDraft(nextTask.objective);
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
    if (!task) return "";
    const complete = task.steps.filter((step) => step.isComplete).length;
    return `${complete}/${task.steps.length} complete`;
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

    const sortedSteps = [...payload.task.steps].sort((a, b) => a.position - b.position);
    const nextTask = { ...payload.task, steps: sortedSteps };
    setTask(nextTask);
    setTitleDraft(nextTask.title);
    setObjectiveDraft(nextTask.objective);
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
        title: titleDraft.trim(),
        objective: objectiveDraft.trim(),
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

      if (!response.ok || !payload.steps) {
        throw new Error(payload.error ?? "Failed to reorder steps.");
      }

      setTask((previous) =>
        previous
          ? {
              ...previous,
              steps: [...payload.steps].sort((a, b) => a.position - b.position),
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
        steps: [...payload.steps].sort((a, b) => a.position - b.position),
      });
      setSuggestedSteps(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply suggested steps.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main>
        <p className="muted">Loading task...</p>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="stack">
        <Link href="/">Back to tasks</Link>
        <p className="error">Task not found.</p>
      </main>
    );
  }

  return (
    <main className="stack">
      <div className="row spread">
        <Link href="/">Back to tasks</Link>
        <a href={`/tasks/${task.id}`} target="_blank" rel="noreferrer" className="small muted">
          Open in new tab
        </a>
      </div>

      <section className="grid two">
        <article className="panel stack">
          <div className="row spread">
            <h1 style={{ margin: 0 }}>{task.title}</h1>
            <label className="row small" style={{ fontWeight: 600 }}>
              <input checked={task.isComplete} onChange={() => void onToggleTask()} type="checkbox" />
              Task complete
            </label>
          </div>

          <p className="muted small" style={{ margin: 0 }}>
            {stepProgress}
          </p>

          <form className="stack" onSubmit={onSaveTaskDetails}>
            <label className="stack small">
              <span>Title</span>
              <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
            </label>
            <label className="stack small">
              <span>Objective</span>
              <textarea
                rows={3}
                value={objectiveDraft}
                onChange={(event) => setObjectiveDraft(event.target.value)}
              />
            </label>
            <div className="row">
              <button className="primary" type="submit" disabled={saving}>
                Save details
              </button>
              <button className="secondary" onClick={() => void loadTask()} type="button">
                Refresh
              </button>
            </div>
          </form>

          <hr style={{ width: "100%", border: 0, borderTop: "1px solid var(--border)" }} />

          <div className="stack">
            <h2 style={{ margin: 0 }}>Steps</h2>

            <form className="row" onSubmit={onAddStep}>
              <input
                value={newStepText}
                onChange={(event) => setNewStepText(event.target.value)}
                placeholder="Add a new step"
              />
              <button className="secondary" type="submit">
                Add
              </button>
            </form>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={task.steps.map((step) => step.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="stack">
                  {task.steps.map((step) => (
                    <SortableStepItem
                      key={step.id}
                      step={step}
                      onToggle={onToggleStep}
                      onDelete={onDeleteStep}
                      onSaveText={onSaveStepText}
                    />
                  ))}
                  {task.steps.length === 0 ? <p className="muted">No steps yet.</p> : null}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </article>

        <aside className="panel stack">
          <h2 style={{ margin: 0 }}>Planner Chat</h2>

          <div className="chat-log">
            {task.messages.length === 0 ? <p className="muted small">No messages yet.</p> : null}
            {task.messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <strong className="small" style={{ textTransform: "capitalize" }}>
                  {message.role}
                </strong>
                <p className="small" style={{ margin: "0.25rem 0 0" }}>
                  {message.content}
                </p>
              </div>
            ))}
          </div>

          <form className="stack" onSubmit={onSendChat}>
            <textarea
              rows={4}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask to refine, split, simplify, or reorder the plan"
            />
            <button className="primary" disabled={sendingChat} type="submit">
              {sendingChat ? "Sending..." : "Send"}
            </button>
            {chatModelUsed ? <p className="small muted">Model used: {chatModelUsed}</p> : null}
          </form>

          {suggestedSteps && suggestedSteps.length > 0 ? (
            <div className="stack">
              <h3 style={{ margin: 0 }}>Suggested Step Update</h3>
              <ol className="small" style={{ marginTop: 0, paddingLeft: "1.25rem" }}>
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
