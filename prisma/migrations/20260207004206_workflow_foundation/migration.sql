-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "estimatedMinutes" INTEGER,
    "recurrence" TEXT NOT NULL DEFAULT 'NONE',
    "weeklyDays" TEXT,
    "reminderHour" INTEGER,
    "reminderMinute" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedOn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TemplateStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'NEXT',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "scheduledFor" DATETIME,
    "dueDate" DATETIME,
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER,
    "completedAt" DATETIME,
    "reviewNotes" TEXT,
    "reminderAt" DATETIME,
    "lastRemindedAt" DATETIME,
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("createdAt", "id", "isComplete", "objective", "title", "updatedAt") SELECT "createdAt", "id", "isComplete", "objective", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_status_scheduledFor_updatedAt_idx" ON "Task"("status", "scheduledFor", "updatedAt");
CREATE INDEX "Task_priority_updatedAt_idx" ON "Task"("priority", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TaskTemplate_isActive_recurrence_idx" ON "TaskTemplate"("isActive", "recurrence");

-- CreateIndex
CREATE INDEX "TemplateStep_templateId_position_idx" ON "TemplateStep"("templateId", "position");
