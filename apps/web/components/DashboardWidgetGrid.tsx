"use client";

import { getModules, loadModuleWidget } from "@aion2/core";
import Link from "next/link";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import "../lib/moduleRegistry";
import { loadEnabledModuleIds, subscribeEnabledModuleIds } from "../lib/moduleToggleStore";
import { ErrorBoundary } from "./ErrorBoundary";

type Loaded = { default: unknown };

type WidgetRef = {
  moduleId: string;
  moduleName: string;
  modulePermission: string;
  widgetId: string;
  title: string;
  href?: string;
};

function WidgetCard({ widget }: { widget: WidgetRef }) {
  const [attempt, setAttempt] = useState(0);
  const Component = useMemo(
    () =>
      lazy(async () => {
        const mod = (await loadModuleWidget(widget.moduleId, widget.widgetId)) as Loaded;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { default: mod.default as any };
      }),
    [widget.moduleId, widget.widgetId, attempt]
  );

  return (
    <div className="widgetCard">
      <div className="widgetCardHeader">
        <div className="widgetCardTitle">{widget.title}</div>
        {widget.href ? (
          <Link className="widgetCardLink" href={widget.href}>
            Open
          </Link>
        ) : null}
      </div>

      {widget.modulePermission !== "public" ? (
        <div className="widgetCardBody">
          <p style={{ margin: 0 }}>
            Requires permission: <code>{widget.modulePermission}</code>
          </p>
        </div>
      ) : (
        <div className="widgetCardBody">
          <ErrorBoundary
            fallback={(error, reset) => (
              <div>
                <p style={{ margin: 0 }}>Failed to load.</p>
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
            <Suspense fallback={<p style={{ margin: 0 }}>Loading…</p>}>
              <Component />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}

export function DashboardWidgetGrid() {
  const [enabledModuleIds, setEnabledModuleIds] = useState<string[] | null>(() =>
    loadEnabledModuleIds()
  );

  useEffect(() => {
    const update = () => setEnabledModuleIds(loadEnabledModuleIds());
    return subscribeEnabledModuleIds(update);
  }, []);

  const enabledSet = enabledModuleIds === null ? null : new Set(enabledModuleIds);
  const widgets: WidgetRef[] = getModules()
    .filter((module) => (enabledSet ? enabledSet.has(module.id) : true))
    .flatMap((module) =>
      module.widgets.map((widget) => ({
        moduleId: module.id,
        moduleName: module.name,
        modulePermission: module.permission,
        widgetId: widget.id,
        title: widget.title,
        ...(module.pages[0]?.href ? { href: module.pages[0].href } : {})
      }))
    );

  const visible = widgets.slice(0, 6);

  if (visible.length === 0) {
    return <p>No widgets registered.</p>;
  }

  return (
    <div className="widgetGrid">
      {visible.map((widget) => (
        <WidgetCard key={`${widget.moduleId}:${widget.widgetId}`} widget={widget} />
      ))}
    </div>
  );
}
