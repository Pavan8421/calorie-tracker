import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportHistory } from "@/features/imports/components/ImportHistory";
import { ImportPreviewTable } from "@/features/imports/components/ImportPreviewTable";
import { ImportUpload } from "@/features/imports/components/ImportUpload";
import {
  useConfirmImport,
  useImportJob,
  useUploadImport,
} from "@/features/imports/hooks";
import {
  IMPORT_STATUS_LABELS,
  type DateFormat,
  type ImportConfirmResponse,
  type ImportJob,
  type ParsedRow,
} from "@/features/imports/types";
import { cn } from "@/lib/utils";

function dateRangeFromRows(rows: ParsedRow[]): { start: string; end: string } | null {
  const dates = rows
    .map((r) => {
      if (typeof r.data.consumed_on === "string" && r.data.consumed_on) {
        return r.data.consumed_on;
      }
      if (typeof r.data.consumed_at === "string" && r.data.consumed_at) {
        return r.data.consumed_at.slice(0, 10);
      }
      return null;
    })
    .filter((d): d is string => Boolean(d))
    .sort();
  if (!dates.length) return null;
  return { start: dates[0], end: dates[dates.length - 1] };
}

function EntriesLink({ start, end }: { start?: string; end?: string }) {
  const to =
    start && end
      ? `/entries?start_date=${start}&end_date=${end}`
      : "/entries";
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
  const [entriesLinkRange, setEntriesLinkRange] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const upload = useUploadImport();
  const confirm = useConfirmImport();
  const jobQuery = useImportJob(activeJobId);

  const job = jobQuery.data ?? null;
  const rows = useMemo(() => job?.parsed_rows ?? [], [job?.parsed_rows]);
  const validRows = useMemo(() => rows.filter((r) => r.status === "valid"), [rows]);

  const previewKey =
    job?.status === "preview_ready" ? `${job.id}:${job.updated_at}` : null;

  useEffect(() => {
    if (!previewKey || !job || job.status !== "preview_ready") return;
    const validNumbers = (job.parsed_rows ?? [])
      .filter((r) => r.status === "valid")
      .map((r) => r.row_number);
    setSelected(new Set(validNumbers));
    setConfirmResult(null);
    setEntriesLinkRange(null);
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
        },
      },
    );
  }

  function handleSelectJob(next: ImportJob) {
    setActiveJobId(next.id);
    setConfirmResult(null);
    setEntriesLinkRange(null);
  }

  function handleConfirm() {
    if (!job || job.status !== "preview_ready") return;
    const rowNumbers = Array.from(selected);
    const range = dateRangeFromRows(
      validRows.filter((r) => selected.has(r.row_number)),
    );

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
  const completedRange =
    job?.status === "completed" ? dateRangeFromRows(validRows) : null;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a tabular food diary PDF, review parsed rows, then import them as entries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>
            Parsing runs in the background. You can review and confirm when the preview is ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportUpload
            disabled={upload.isPending || isParsing}
            isUploading={upload.isPending}
            onUpload={handleUpload}
          />
        </CardContent>
      </Card>

      {activeJobId ? (
        <Card>
          <CardHeader>
            <CardTitle>Current import</CardTitle>
            <CardDescription>
              {job ? (
                <>
                  {job.filename} · {IMPORT_STATUS_LABELS[job.status]}
                </>
              ) : (
                "Loading job…"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {jobQuery.isLoading && !job ? (
              <LoadingState label="Loading import…" />
            ) : null}

            {jobQuery.isError ? (
              <ErrorState
                message="Could not load this import job."
                onRetry={() => void jobQuery.refetch()}
              />
            ) : null}

            {isParsing ? (
              <LoadingState label="Parsing PDF… this usually takes a few seconds." />
            ) : null}

            {job?.status === "failed" ? (
              <ErrorState
                message={job.error_message || "Parsing failed. Try another PDF."}
              />
            ) : null}

            {confirmResult ? (
              <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium">
                  Imported {confirmResult.imported_count} entr
                  {confirmResult.imported_count === 1 ? "y" : "ies"}
                  {confirmResult.skipped_duplicates > 0
                    ? ` · skipped ${confirmResult.skipped_duplicates} duplicate${confirmResult.skipped_duplicates === 1 ? "" : "s"}`
                    : null}
                  .
                </p>
                <EntriesLink
                  start={entriesLinkRange?.start}
                  end={entriesLinkRange?.end}
                />
              </div>
            ) : null}

            {job?.status === "preview_ready" && !confirmResult ? (
              <div className="grid gap-4">
                <p className="text-sm text-muted-foreground">
                  {validRows.length} valid · {rows.length - validRows.length} invalid ·{" "}
                  {selected.size} selected
                </p>

                <ImportPreviewTable
                  rows={rows}
                  selected={selected}
                  onSelectedChange={setSelected}
                />

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                  />
                  <span>Skip duplicates (same day, meal, food, and calories)</span>
                </label>

                <Button
                  type="button"
                  disabled={selected.size === 0 || confirm.isPending}
                  onClick={handleConfirm}
                >
                  {confirm.isPending
                    ? "Importing…"
                    : `Import ${selected.size} selected`}
                </Button>
              </div>
            ) : null}

            {job?.status === "completed" && !confirmResult ? (
              <div className="grid gap-2 text-sm">
                <p>
                  This import finished with {job.imported_count} entr
                  {job.imported_count === 1 ? "y" : "ies"}.
                </p>
                <EntriesLink start={completedRange?.start} end={completedRange?.end} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Import history</CardTitle>
          <CardDescription>Past uploads and their status.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImportHistory
            page={historyPage}
            onPageChange={setHistoryPage}
            activeJobId={activeJobId}
            onSelectJob={handleSelectJob}
          />
        </CardContent>
      </Card>
    </div>
  );
}
