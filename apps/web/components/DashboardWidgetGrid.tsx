"use client";

import { getModules } from "@aion2/core";
import Link from "next/link";
import { Suspense, lazy, useMemo } from "react";

import "../lib/moduleRegistry";

type Loaded = { default: unknown };

type WidgetRef = {
  moduleId: string;
  moduleName: string;
  modulePermission: string;
  widgetId: string;
  title: string;
  load: () => Promise<Loaded>;
  href?: string;
};

function WidgetCard({ widget }: { widget: WidgetRef }) {
  const Component = useMemo(
    () =>
      lazy(async () => {
        const mod = (await widget.load()) as Loaded;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { default: mod.default as any };
      }),
    [widget]
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
          <Suspense fallback={<p style={{ margin: 0 }}>Loading…</p>}>
            <Component />
          </Suspense>
        </div>
      )}
    </div>
  );
}

export function DashboardWidgetGrid() {
  const widgets: WidgetRef[] = getModules().flatMap((module) =>
    module.widgets.map((widget) => ({
      moduleId: module.id,
      moduleName: module.name,
      modulePermission: module.permission,
      widgetId: widget.id,
      title: widget.title,
      load: widget.load,
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
