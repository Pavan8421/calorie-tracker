import { FileText, Upload } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { type DateFormat } from "@/features/imports/types";
import { cn } from "@/lib/utils";

const ACCEPTED = "application/pdf,.pdf";
const MAX_BYTES = 10 * 1024 * 1024;

const FORMAT_OPTIONS = [
  { value: "DMY", label: "Day / month / year, 24/10/2026" },
  { value: "MDY", label: "Month / day / year, 10/24/2026" },
];

type ImportUploadProps = {
  disabled?: boolean;
  isUploading?: boolean;
  onUpload: (file: File, dateFormat: DateFormat) => void;
};

export function ImportUpload({ disabled, isUploading, onUpload }: ImportUploadProps) {
  const inputId = useId();
  const formatId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>("DMY");
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function pickFile(next: File | null) {
    setLocalError(null);
    if (!next) {
      setFile(null);
      return;
    }
    const isPdf =
      next.type === "application/pdf" || next.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setLocalError("Please choose a PDF file.");
      setFile(null);
      return;
    }
    if (next.size > MAX_BYTES) {
      setLocalError("PDF must be 10 MB or smaller.");
      setFile(null);
      return;
    }
    setFile(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || disabled || isUploading) return;
    onUpload(file, dateFormat);
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong bg-surface px-4 py-6 text-center",
          dragOver && "border-primary bg-primary-soft/40",
          (disabled || isUploading) && "opacity-60",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          pickFile(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
          <Upload className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold">Drop a food diary PDF here</p>
          <p className="text-[11px] text-muted-foreground">PDF only · max 10 MB · up to 20 pages</p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          disabled={disabled || isUploading}
          onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          Choose PDF
        </Button>
        {file ? (
          <p className="flex max-w-full items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              ({(file.size / 1024).toFixed(0)} KB)
            </span>
          </p>
        ) : null}
      </div>

      {localError ? <p className="text-[11px] text-destructive">{localError}</p> : null}

      <div className="flex flex-col gap-1">
        <Label htmlFor={formatId} className="text-xs">
          Dates in this PDF are
        </Label>
        <Select
          id={formatId}
          value={dateFormat}
          disabled={disabled || isUploading}
          options={FORMAT_OPTIONS}
          onChange={(value) => setDateFormat(value as DateFormat)}
          className="h-9 text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          Used to parse ambiguous dates like 03/04/2026.
        </p>
      </div>

      <Button type="submit" size="sm" className="w-fit" disabled={!file || disabled || isUploading}>
        {isUploading ? "Uploading…" : "Upload and parse"}
      </Button>
    </form>
  );
}
