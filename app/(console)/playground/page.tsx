"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { buttonClass } from "@/components/Button";
import { useTenants } from "@/components/hooks";
import { Select } from "@/components/form";
import { Icon } from "@/components/icons";
import { runInference } from "@/lib/api/client";
import type { ChatRole } from "@/lib/domain/inference";
import { cn } from "@/lib/cn";
import { formatRate } from "@/lib/format";

interface Turn {
  role: ChatRole;
  content: string;
  tokens?: number;
  latencyMs?: number;
}

export default function PlaygroundPage() {
  const { tenants } = useTenants(3000);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const running = useMemo(
    () => (tenants ?? []).filter((t) => t.status === "running"),
    [tenants],
  );
  const selected = running.find((t) => t.id === selectedId) ?? null;

  // Auto-select the first running endpoint; if the current selection stops
  // running (e.g. torn down), fall back to another live one. Reset on switch.
  useEffect(() => {
    if (running.length === 0) return;
    if (!selectedId || !running.some((t) => t.id === selectedId)) {
      setSelectedId(running[0].id);
    }
  }, [running, selectedId]);
  useEffect(() => {
    setTurns([]);
    setError(null);
  }, [selectedId]);

  async function send() {
    const prompt = input.trim();
    if (!prompt || !selected || pending) return;
    setInput("");
    setError(null);
    setTurns((t) => [...t, { role: "user", content: prompt }]);
    setPending(true);
    try {
      const result = await runInference(selected.id, prompt);
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: result.reply,
          tokens: result.tokens,
          latencyMs: result.latencyMs,
        },
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Playground</h1>
        <p className="text-sm text-ink2">
          Send a prompt to the tenant’s own private endpoint — real inference, not
          a shared API.
        </p>
      </div>

      {tenants !== null && running.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ContextBar
            selectedId={selectedId}
            running={running}
            onSelect={setSelectedId}
            rate={selected?.ratePerHour ?? 0}
            endpoint={selected?.endpointUrl ?? null}
            region={selected?.region ?? ""}
          />
          <Transcript
            turns={turns}
            pending={pending}
            error={error}
            model={selected?.model ?? "the model"}
            input={input}
            onInput={setInput}
            onSend={send}
            disabled={!selected}
          />
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-iso-bg">
        <Icon name="terminal" size={20} className="text-iso" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">No running endpoints yet</h2>
        <p className="max-w-md text-sm text-ink2">
          Provision a dedicated endpoint, then come back here to send it a prompt
          and watch it answer privately.
        </p>
      </div>
      <Link href="/provisioning" className={buttonClass("primary")}>
        <Icon name="zap" size={16} />
        Provision an endpoint
      </Link>
    </div>
  );
}

function ContextBar({
  selectedId,
  running,
  onSelect,
  rate,
  endpoint,
  region,
}: {
  selectedId: string | null;
  running: { id: string; name: string; region: string }[];
  onSelect: (id: string) => void;
  rate: number;
  endpoint: string | null;
  region: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line-subtle bg-surface px-4 py-3">
      <span className="size-2 rounded-full bg-run" />
      <div className="w-56">
        <Select
          value={selectedId ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Tenant endpoint"
        >
          {running.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.region.split(" · ")[0]}
            </option>
          ))}
        </Select>
      </div>
      <span className="hidden font-mono text-[11px] text-ink3 sm:inline">
        {endpoint ? endpoint.replace("https://", "") : ""}
        {region ? ` · ${region}` : ""}
      </span>
      <span className="flex items-center gap-1.5 rounded-full bg-iso-bg px-2.5 py-[5px]">
        <Icon name="lock" size={13} className="text-iso" />
        <span className="text-xs font-medium text-iso-strong">
          Private &amp; isolated
        </span>
      </span>
      <span className="ml-auto flex items-center gap-1.5 rounded-full bg-track px-3 py-1.5">
        <span className="size-[7px] rounded-full bg-under" />
        <span className="font-mono text-[13px] font-medium text-ink">
          {formatRate(rate)}
        </span>
        <span className="text-xs text-ink3">· isolated</span>
      </span>
    </div>
  );
}

function Transcript({
  turns,
  pending,
  error,
  model,
  input,
  onInput,
  onSend,
  disabled,
}: {
  turns: Turn[];
  pending: boolean;
  error: string | null;
  model: string;
  input: string;
  onInput: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, pending]);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line-subtle bg-surface p-5">
      <div className="flex max-h-[440px] min-h-[160px] flex-col gap-4 overflow-auto">
        {turns.length === 0 && !pending && (
          <p className="py-8 text-center text-sm text-ink3">
            Ask the private model something to see it answer on this tenant’s
            dedicated endpoint.
          </p>
        )}
        {turns.map((turn, i) => (
          <Message key={i} turn={turn} model={model} />
        ))}
        {pending && <Thinking model={model} />}
        <div ref={endRef} />
      </div>

      {error && <p className="text-sm text-over">{error}</p>}

      <div className="flex items-center gap-2.5 rounded-md border border-line bg-surface py-2 pl-3.5 pr-2">
        <input
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask the private model something…"
          aria-label="Prompt"
          disabled={disabled || pending}
          className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink3 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || pending || !input.trim()}
          aria-label="Send prompt"
          className="flex size-[38px] items-center justify-center rounded-md bg-brand text-brand-on hover:bg-brand-hover disabled:opacity-50"
        >
          <Icon name="send" size={17} />
        </button>
      </div>
    </div>
  );
}

function Message({ turn, model }: { turn: Turn; model: string }) {
  const isUser = turn.role === "user";
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "size-8 shrink-0 rounded-full",
          isUser ? "bg-idle" : "bg-iso",
        )}
      />
      <div className="flex flex-1 flex-col gap-1">
        <span
          className={cn(
            "text-xs font-medium",
            isUser ? "text-ink3" : "text-iso-strong",
          )}
        >
          {isUser ? "You" : `${model} · private endpoint`}
        </span>
        <div
          className={cn(
            "rounded-md px-3.5 py-2.5 text-sm leading-relaxed text-ink",
            isUser ? "bg-subtle" : "bg-iso-bg",
          )}
        >
          {turn.content}
        </div>
        {!isUser && turn.tokens != null && (
          <span className="font-mono text-[11px] text-ink3">
            {turn.tokens} tokens · {turn.latencyMs} ms · streamed from your private
            endpoint
          </span>
        )}
      </div>
    </div>
  );
}

function Thinking({ model }: { model: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="size-8 shrink-0 rounded-full bg-iso" />
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-iso-strong">
          {model} · private endpoint
        </span>
        <div className="flex items-center gap-1 rounded-md bg-iso-bg px-3.5 py-3">
          <span className="size-1.5 animate-pulse rounded-full bg-iso" />
          <span className="size-1.5 animate-pulse rounded-full bg-iso [animation-delay:150ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-iso [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
