import { Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/api/errors";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DraftReview } from "@/features/scan/components/DraftReview";
import { useAnalyzeImage } from "@/features/scan/hooks";
import {
  ANALYZE_HINTS,
  type AnalyzeHint,
  type DraftFoodItem,
  type ImageAnalysisResponse,
} from "@/features/scan/types";
import { cn } from "@/lib/utils";

const ACCEPTED = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

type ScanPhotoDialogProps = {
  open: boolean;
  onClose: () => void;
  onUseDraft: (item: DraftFoodItem, analysisNotes: string) => void;
};

export function ScanPhotoDialog({ open, onClose, onUseDraft }: ScanPhotoDialogProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hint, setHint] = useState<AnalyzeHint>("auto");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analysis, setAnalysis] = useState<ImageAnalysisResponse | null>(null);
  const analyze = useAnalyzeImage();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (open) return;
    setHint("auto");
    setFile(null);
    setAnalysis(null);
    setDragOver(false);
  }, [open]);

  if (!open) return null;

  function pickFile(next: File | null) {
    if (!next) return;
    if (!ACCEPTED.split(",").includes(next.type) && !next.type.startsWith("image/")) {
      toast.error("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (next.size > MAX_BYTES) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    setFile(next);
    setAnalysis(null);
    analyze.reset();
  }

  async function runAnalyze() {
    if (!file) {
      toast.error("Choose an image first.");
      return;
    }
    try {
      const result = await analyze.mutateAsync({ file, hint });
      setAnalysis(result);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error("Something went wrong, please try again");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-photo-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="scan-photo-title" className="text-lg font-semibold">
              Scan photo
            </h2>
            <p className="text-sm text-muted-foreground">
              Upload a nutrition label or plate photo. No camera capture — file picker or drag
              and drop only.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {analyze.isPending ? (
          <LoadingState label="Analyzing image… this can take several seconds." />
        ) : null}

        {!analyze.isPending && analysis ? (
          <DraftReview
            analysis={analysis}
            onUse={(item) => {
              onUseDraft(item, analysis.notes);
              onClose();
            }}
            onRescan={() => {
              setAnalysis(null);
              setFile(null);
              analyze.reset();
            }}
          />
        ) : null}

        {!analyze.isPending && !analysis ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image type hint</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {ANALYZE_HINTS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setHint(option.value)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      hint === option.value
                        ? "border-primary bg-accent font-medium text-teal-900"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="block">{option.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onClick={() => inputRef.current?.click()}
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
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center transition-colors",
                dragOver
                  ? "border-primary bg-accent/60"
                  : "border-border bg-muted/30 hover:bg-muted/50",
              )}
            >
              <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">Drag and drop an image here</p>
              <p className="text-xs text-muted-foreground">or click to choose a file (JPEG, PNG, WebP · max 5 MB)</p>
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                onChange={(e) => {
                  pickFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </div>

            {previewUrl && file ? (
              <div className="space-y-2">
                <p className="truncate text-xs text-muted-foreground">{file.name}</p>
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  className="max-h-56 w-full rounded-lg border border-border object-contain bg-muted/40"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void runAnalyze()} disabled={!file}>
                Analyze image
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
