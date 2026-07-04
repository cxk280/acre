import { cn } from "@/lib/cn";

/** The Acre wordmark glyph: a brand square with a teal "slice" (a GPU fraction). */
export function Mark({ size = 26 }: { size?: number }) {
  const slice = Math.round(size * 0.38);
  const inset = Math.round(size * 0.12);
  return (
    <div className="relative rounded-md bg-brand" style={{ width: size, height: size }}>
      <div
        className={cn("absolute rounded-sm bg-iso")}
        style={{ width: slice, height: slice, right: inset, bottom: inset }}
      />
    </div>
  );
}
