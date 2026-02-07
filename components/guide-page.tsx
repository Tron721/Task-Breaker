import Link from "next/link";

export function GuidePage() {
  return (
    <main className="page-shell page-enter stack">
      <section className="panel hero stack">
        <span className="badge">Guide</span>
        <h1 className="hero-title">Task Breaker User Guide</h1>
        <p className="hero-subtitle">
          A practical walkthrough for daily planning, step execution, and end-of-day review in the Task Breaker workflow.
        </p>
        <div className="row wrap">
          <Link href="/" className="link-btn">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="grid two">
        <article className="panel stack">
          <h2 className="section-title">Quick Start</h2>
          <ol className="plain-list small">
            <li>Set your working date in the Morning Setup panel.</li>
            <li>Click Generate for day to materialize recurring templates.</li>
            <li>Use Quick Capture to add new work and auto-generate steps.</li>
            <li>Execute from the Today Queue with the Now/Next/Later buckets.</li>
            <li>Use Run daily review at the end of the day to roll unfinished work and create a digest.</li>
          </ol>
        </article>

        <article className="panel stack">
          <h2 className="section-title">Status System</h2>
          <p className="section-subtitle">Each task stays in one queue state so your plan is explicit.</p>
          <div className="stack">
            <p className="small" style={{ margin: 0 }}>
              <strong>NOW:</strong> Immediate focus. Keep this list short.
            </p>
            <p className="small" style={{ margin: 0 }}>
              <strong>NEXT:</strong> Ready to pull when NOW items finish.
            </p>
            <p className="small" style={{ margin: 0 }}>
              <strong>LATER:</strong> Deferred for this day or later in the week.
            </p>
            <p className="small" style={{ margin: 0 }}>
              <strong>DONE:</strong> Closed work that remains visible for reporting.
            </p>
          </div>
        </article>
      </section>

      <section className="panel stack">
        <h2 className="section-title">Daily Operating Loop</h2>
        <div className="bucket-grid">
          <article className="bucket-column stack">
            <h3 className="bucket-title">1. Plan Morning</h3>
            <p className="small muted" style={{ margin: 0 }}>
              Materialize recurring templates, inspect overdue items, and refresh the dashboard.
            </p>
          </article>
          <article className="bucket-column stack">
            <h3 className="bucket-title">2. Execute</h3>
            <p className="small muted" style={{ margin: 0 }}>
              Work from NOW first, move tasks between queues as priorities change, and check off steps in task detail.
            </p>
          </article>
          <article className="bucket-column stack">
            <h3 className="bucket-title">3. Refine</h3>
            <p className="small muted" style={{ margin: 0 }}>
              Open tasks to edit details, add or reorder steps, and use Planner Chat for step suggestions.
            </p>
          </article>
          <article className="bucket-column stack">
            <h3 className="bucket-title">4. Review Evening</h3>
            <p className="small muted" style={{ margin: 0 }}>
              Run daily review to complete reporting, capture digest notes, and carry unfinished work forward.
            </p>
          </article>
        </div>
      </section>

      <section className="grid two">
        <article className="panel stack">
          <h2 className="section-title">Recurring Templates</h2>
          <p className="section-subtitle">Use templates for repeated workflows.</p>
          <ol className="plain-list small">
            <li>Create a template with objective, steps, priority, and schedule.</li>
            <li>Set recurrence to Daily, Weekly, or Manual.</li>
            <li>Keep templates Active to include them in morning generation.</li>
            <li>Use Instantiate for day when you need one immediately.</li>
          </ol>
        </article>

        <article className="panel stack">
          <h2 className="section-title">Task Detail Tips</h2>
          <ul className="plain-list small">
            <li>Edit title, objective, due date, reminders, and review notes.</li>
            <li>Drag steps to change sequence and keep execution order logical.</li>
            <li>Apply chat-suggested steps when the plan needs a better breakdown.</li>
            <li>Track progress using the step completion bar in the task header.</li>
          </ul>
        </article>
      </section>

      <section className="panel stack">
        <h2 className="section-title">Troubleshooting</h2>
        <div className="stack">
          <p className="small" style={{ margin: 0 }}>
            <strong>Tasks not loading:</strong> click Refresh dashboard first, then verify the API/database environment configuration.
          </p>
          <p className="small" style={{ margin: 0 }}>
            <strong>No recurring tasks generated:</strong> confirm templates are Active and recurrence settings match your day.
          </p>
          <p className="small" style={{ margin: 0 }}>
            <strong>Unexpected priorities:</strong> edit task details directly and update queue status from the Today Queue controls.
          </p>
        </div>
      </section>
    </main>
  );
}
