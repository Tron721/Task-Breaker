"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type TaskSummary = {
  id: string;
  title: string;
  objective: string;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
  totalSteps: number;
  completeSteps: number;
};

export function TaskListPage() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function fetchTasks() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      const payload = (await response.json()) as { tasks?: TaskSummary[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load tasks.");
      }
      setTasks(payload.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchTasks();
  }, []);

  async function onCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!objective.trim()) {
      setError("Please enter an objective.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          objective: objective.trim(),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create task.");
      }

      setTitle("");
      setObjective("");
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setSubmitting(false);
    }
  }

  const completeCount = useMemo(() => tasks.filter((task) => task.isComplete).length, [tasks]);

  return (
    <main className="stack">
      <section className="panel stack">
        <h1 style={{ margin: 0 }}>Task Planner</h1>
        <p className="muted" style={{ margin: 0 }}>
          Enter an objective, generate logical steps, and track progress by ticking items as you complete them.
        </p>
      </section>

      <section className="grid two">
        <article className="panel stack">
          <h2 style={{ margin: 0 }}>Create New Task</h2>
          <form className="stack" onSubmit={onCreateTask}>
            <label className="stack small">
              <span>Title (optional)</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Launch my portfolio site"
              />
            </label>

            <label className="stack small">
              <span>Objective</span>
              <textarea
                rows={4}
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder="Describe what you want to accomplish..."
              />
            </label>

            <div className="row">
              <button className="primary" disabled={submitting} type="submit">
                {submitting ? "Generating..." : "Generate Steps"}
              </button>
              <button className="secondary" disabled={submitting} type="button" onClick={() => void fetchTasks()}>
                Refresh
              </button>
            </div>
          </form>

          {error ? <p className="error small">{error}</p> : null}
        </article>

        <aside className="panel stack">
          <h2 style={{ margin: 0 }}>Overview</h2>
          <p className="muted small" style={{ margin: 0 }}>
            {loading ? "Loading tasks..." : `${completeCount} of ${tasks.length} tasks complete`}
          </p>
        </aside>
      </section>

      <section className="panel stack">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>Tasks</h2>
          <button className="secondary" onClick={() => void fetchTasks()} type="button">
            Reload
          </button>
        </div>

        {loading ? <p className="muted">Loading...</p> : null}

        {!loading && tasks.length === 0 ? <p className="muted">No tasks yet.</p> : null}

        <div className="stack">
          {tasks.map((task) => (
            <article key={task.id} className={`task-card ${task.isComplete ? "complete" : ""}`}>
              <div className="row spread">
                <div className="stack" style={{ gap: "0.25rem" }}>
                  <strong>{task.title}</strong>
                  <span className="muted small">{task.objective}</span>
                  <span className="small muted">
                    {task.completeSteps}/{task.totalSteps} steps complete
                  </span>
                </div>
                <div className="row">
                  <Link href={`/tasks/${task.id}`}>Open</Link>
                  <a href={`/tasks/${task.id}`} target="_blank" rel="noreferrer" className="small muted">
                    New tab
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
