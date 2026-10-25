import { format } from "date-fns";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { ImportHistory } from "@/features/imports/components/ImportHistory";
import { ImportPreviewTable } from "@/features/imports/components/ImportPreviewTable";
import { ImportUpload } from "@/features/imports/components/ImportUpload";
import { useConfirmImport, useImportJob, useUploadImport } from "@/features/imports/hooks";
import type {
  DateFormat,
  ImportConfirmResponse,
  ImportJob,
  ParsedRow,
} from "@/features/imports/types";
import { cn } from "@/lib/utils";

const STEPS = ["Upload", "Review", "Import"] as const;

function dateRangeFromRows(rows: ParsedRow[]): { start: string; end: string } | null {
  const dates = rows
    .map((row) => {
      if (typeof row.data.consumed_on === "string" && row.data.consumed_on) {
        return row.data.consumed_on;
      }
      if (typeof row.data.consumed_at === "string" && row.data.consumed_at) {
        return row.data.consumed_at.slice(0, 10);
      }
      return null;
    })
    .filter((day): day is string => Boolean(day))
    .sort();
  if (!dates.length) return null;
  return { start: dates[0], end: dates[dates.length - 1] };
}

function dateFormatLabel(value: string): string {
  if (value === "MDY") return "Month / day / year, 10/24/2026";
  return "Day / month / year, 24/10/2026";
}

function EntriesLink({ start, end }: { start?: string; end?: string }) {
  const to = start && end ? `/entries?start_date=${start}&end_date=${end}` : "/entries";
  return (
    <Link to={to} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
      {start && end ? "View imported entries" : "View entries"}
    </Link>
  );
}

export function ImportPage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [confirmResult, setConfirmResult] = useState<ImportConfirmResponse | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [entriesLinkRange, setEntriesLinkRange] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const upload = useUploadImport();
  const confirm = useConfirmImport();
  const jobQuery = useImportJob(activeJobId);

  const job = jobQuery.data ?? null;
  const rows = useMemo(() => job?.parsed_rows ?? [], [job?.parsed_rows]);
  const validRows = useMemo(() => rows.filter((row) => row.status === "valid"), [rows]);

  const previewKey = job?.status === "preview_ready" ? `${job.id}:${job.updated_at}` : null;

  useEffect(() => {
    if (!previewKey || !job || job.status !== "preview_ready") return;
    const validNumbers = (job.parsed_rows ?? [])
      .filter((row) => row.status === "valid")
      .map((row) => row.row_number);
    setSelected(new Set(validNumbers));
    setConfirmResult(null);
    setEntriesLinkRange(null);
    setReplacing(false);
    // job is read when previewKey changes (new ready preview).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  function handleUpload(file: File, dateFormat: DateFormat) {
    setConfirmResult(null);
    setEntriesLinkRange(null);
    upload.mutate(
      { file, dateFormat },
      {
        onSuccess: (created) => {
          setActiveJobId(created.id);
          setHistoryPage(1);
          setReplacing(false);
        },
      },
    );
  }

  function handleSelectJob(next: ImportJob) {
    setActiveJobId(next.id);
    setConfirmResult(null);
    setEntriesLinkRange(null);
    setReplacing(false);
  }

  function handleConfirm() {
    if (!job || job.status !== "preview_ready") return;
    const rowNumbers = Array.from(selected);
    const range = dateRangeFromRows(validRows.filter((row) => selected.has(row.row_number)));

    confirm.mutate(
      {
        jobId: job.id,
        payload: {
          row_numbers: rowNumbers,
          skip_duplicates: skipDuplicates,
        },
      },
      {
        onSuccess: (result) => {
          setConfirmResult(result);
          setEntriesLinkRange(range);
        },
      },
    );
  }

  const isParsing = job?.status === "pending" || job?.status === "processing";
  const completedRange = job?.status === "completed" ? dateRangeFromRows(validRows) : null;
  const step =
    confirmResult || job?.status === "completed" ? 3 : job?.status === "preview_ready" ? 2 : 1;
  const showUpload = replacing || (step === 1 && !isParsing);
  const showJobPanel = Boolean(
    activeJobId &&
      ((jobQuery.isLoading && !job) ||
        jobQuery.isError ||
        job?.status === "failed" ||
        confirmResult ||
        (job?.status === "preview_ready" && !confirmResult) ||
        (job?.status === "completed" && !confirmResult)),
  );

  return (
    <div className="tabular-data flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight">Import</h1>
          <p className="text-xs text-muted-foreground">Turn a food diary PDF into entries.</p>
        </div>
        <ImportSteps current={step} />
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          {job && !replacing ? (
            <section className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-extrabold text-[#9A5B0B]">
                  PDF
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{job.filename}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isParsing
                      ? "Parsing this PDF…"
                      : job.status === "failed"
                        ? "Parsing failed"
                        : `Parsed ${rows.length} rows, ${format(new Date(job.updated_at), "d MMM, h:mm a")}`}
                  </p>
                  {job.date_format ? (
                    <p className="text-[11px] text-stone-700">
                      Dates in this PDF are {dateFormatLabel(job.date_format)}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setReplacing(true)}>
                Choose another PDF
              </Button>
            </section>
          ) : null}

          {showUpload ? (
            <section className="rounded-2xl border border-border bg-card px-4 py-3">
              {replacing && job ? (
                <div className="mb-2 flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReplacing(false)}>
                    Cancel
                  </Button>
                </div>
              ) : null}
              <ImportUpload
                disabled={upload.isPending || isParsing}
                isUploading={upload.isPending}
                onUpload={handleUpload}
              />
            </section>
          ) : null}

          {showJobPanel ? (
            <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card py-3">
              {jobQuery.isLoading && !job ? <LoadingState label="Loading import…" /> : null}
              {jobQuery.isError ? (
                <div className="px-4">
                  <ErrorState
                    message="Could not load this import job."
                    onRetry={() => void jobQuery.refetch()}
                  />
                </div>
              ) : null}
              {job?.status === "failed" ? (
                <div className="px-4">
                  <ErrorState message={job.error_message || "Parsing failed. Try another PDF."} />
                </div>
              ) : null}

              {confirmResult ? (
                <div className="mx-4 flex flex-col gap-2 rounded-xl bg-primary-soft/50 px-3 py-3">
                  <p className="text-xs font-semibold">
                    Imported {confirmResult.imported_count} entr
                    {confirmResult.imported_count === 1 ? "y" : "ies"}
                    {confirmResult.skipped_duplicates > 0
                      ? ` · skipped ${confirmResult.skipped_duplicates} duplicate${confirmResult.skipped_duplicates === 1 ? "" : "s"}`
                      : ""}
                    .
                  </p>
                  <EntriesLink start={entriesLinkRange?.start} end={entriesLinkRange?.end} />
                </div>
              ) : null}

              {job?.status === "preview_ready" && !confirmResult ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4">
                    <h2 className="text-sm font-bold">Review rows</h2>
                    <div className="flex gap-1.5 text-[11px] font-semibold">
                      <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-primary-ink">
                        {validRows.length} ready
                      </span>
                      <span className="rounded-lg bg-muted px-2 py-0.5 text-stone-700">
                        {rows.length - validRows.length} with problems
                      </span>
                    </div>
                  </div>
                  <ImportPreviewTable rows={rows} selected={selected} onSelectedChange={setSelected} />
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4">
                    <label className="flex items-center gap-2 text-xs text-stone-700">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-primary"
                        checked={skipDuplicates}
                        onChange={(event) => setSkipDuplicates(event.target.checked)}
                      />
                      Skip rows already logged (same day, meal, food and calories)
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      disabled={selected.size === 0 || confirm.isPending}
                      onClick={handleConfirm}
                    >
                      {confirm.isPending
                        ? "Importing…"
                        : `Import ${selected.size} entr${selected.size === 1 ? "y" : "ies"}`}
                    </Button>
                  </div>
                </div>
              ) : null}

              {job?.status === "completed" && !confirmResult ? (
                <div className="flex flex-col gap-2 px-4 text-xs">
                  <p>
                    This import finished with {job.imported_count} entr
                    {job.imported_count === 1 ? "y" : "ies"}.
                  </p>
                  <EntriesLink start={completedRange?.start} end={completedRange?.end} />
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card py-3">
          <h2 className="px-4 text-sm font-bold">Past imports</h2>
          <ImportHistory
            page={historyPage}
            onPageChange={setHistoryPage}
            activeJobId={activeJobId}
            onSelectJob={handleSelectJob}
          />
          <p className="px-4 text-[11px] text-muted-foreground">
            PDFs up to 10 MB and 20 pages. Rows need a date, meal, food and calories.
          </p>
        </section>
      </div>
    </div>
  );
}

function ImportSteps({ current }: { current: number }) {
  return (
    <ol aria-label="Progress" className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        return (
          <li key={label} className="flex items-center gap-2">
            {index > 0 ? <span className="h-px w-6 bg-[#CFC5B5]" aria-hidden /> : null}
            <span
              className={cn(
                "flex items-center gap-1.5",
                done && "font-semibold text-primary",
                active && "font-bold text-foreground",
                !done && !active && "font-medium text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px]",
                  done && "bg-primary-soft text-primary",
                  active && "bg-primary text-white",
                  !done && !active && "border border-[#CFC5B5]",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : number}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
