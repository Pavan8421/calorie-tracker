import { FileText, Upload } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DATE_FORMAT_OPTIONS,
  type DateFormat,
} from "@/features/imports/types";
import { cn } from "@/lib/utils";

const ACCEPTED = "application/pdf,.pdf";
const MAX_BYTES = 10 * 1024 * 1024;

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || disabled || isUploading) return;
    onUpload(file, dateFormat);
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center transition-colors",
          dragOver && "border-primary bg-primary/5",
          (disabled || isUploading) && "opacity-60",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0] ?? null;
          pickFile(dropped);
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="grid gap-1">
          <p className="text-sm font-medium">Drop a food diary PDF here</p>
          <p className="text-xs text-muted-foreground">
            Or choose a file · PDF only · max 10 MB · up to 20 pages
          </p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          disabled={disabled || isUploading}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
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
          <p className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate max-w-[280px]">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              ({(file.size / 1024).toFixed(0)} KB)
            </span>
          </p>
        ) : null}
      </div>

      {localError ? <p className="text-sm text-destructive">{localError}</p> : null}

      <div className="grid gap-2">
        <Label htmlFor={formatId}>Date format in the PDF</Label>
        <select
          id={formatId}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={dateFormat}
          disabled={disabled || isUploading}
          onChange={(e) => setDateFormat(e.target.value as DateFormat)}
        >
          {DATE_FORMAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.hint})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Used to parse ambiguous dates like 03/04/2026.
        </p>
      </div>

      <Button type="submit" disabled={!file || disabled || isUploading}>
        {isUploading ? "Uploading…" : "Upload & parse"}
      </Button>
    </form>
  );
}
