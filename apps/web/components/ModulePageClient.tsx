"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import { loadModulePage, resolveModulePage } from "@aion2/core";

import "../lib/moduleRegistry";
import { loadEnabledModuleIds, subscribeEnabledModuleIds } from "../lib/moduleToggleStore";
import { ErrorBoundary } from "./ErrorBoundary";

type Loaded = { default: unknown };

export function ModulePageClient() {
  const params = useParams();
  const moduleId = String(params.moduleId);
  const pageId = String(params.pageId);

  const [enabledModuleIds, setEnabledModuleIds] = useState<string[] | null>(() =>
    loadEnabledModuleIds()
  );

  useEffect(() => {
    const update = () => setEnabledModuleIds(loadEnabledModuleIds());
    return subscribeEnabledModuleIds(update);
  }, []);

  const resolved = resolveModulePage(moduleId, pageId);
  if (!resolved) {
    return (
      <main>
        <h1>Not Found</h1>
        <p>
          Module/page not found: <code>{moduleId}</code> / <code>{pageId}</code>
        </p>
        <p>
          <Link href="/">Go back to Dashboard</Link>
        </p>
      </main>
    );
  }

  const { module, page } = resolved;
  const enabledSet = enabledModuleIds === null ? null : new Set(enabledModuleIds);

  if (enabledSet && !enabledSet.has(module.id)) {
    return (
      <main>
        <h1>{module.name}</h1>
        <p>
          This module is disabled in <Link href="/settings/modules">Settings → Modules</Link>.
        </p>
      </main>
    );
  }

  if (module.permission !== "public") {
    return (
      <main>
        <h1>{module.name}</h1>
        <p>
          This module requires permission: <code>{module.permission}</code>
        </p>
        <p>(Auth/권한 체크는 다음 단계에서 연결합니다.)</p>
      </main>
    );
  }

  const [attempt, setAttempt] = useState(0);
  const PageComponent = useMemo(
    () =>
      lazy(async () => {
        const mod = (await loadModulePage(moduleId, pageId)) as Loaded;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { default: mod.default as any };
      }),
    [moduleId, pageId, attempt]
  );

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>{page.title}</h1>
      <ErrorBoundary
        fallback={(error, reset) => (
          <div>
            <p style={{ marginTop: 0 }}>Failed to load this page.</p>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              <code>{error.message}</code>
            </pre>
            <button
              type="button"
              onClick={() => {
                setAttempt((v) => v + 1);
                reset();
              }}
            >
              Retry
            </button>
          </div>
        )}
      >
        <Suspense fallback={<p>Loading…</p>}>
          <PageComponent />
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}
