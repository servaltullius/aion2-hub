import { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Select } from "../components/ui/select.js";
import { isObject } from "../lib/guards.js";

type AppCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
};

type AlertEvent = {
  id: string;
  itemName: string;
  op: "<" | "<=" | ">" | ">=";
  threshold: number;
  price: number;
  triggeredAt: string;
  readAt: string | null;
};

type WatchRow = {
  id: string;
  itemName: string;
  op: "<" | "<=" | ">" | ">=";
  threshold: number;
  active: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function asAlertEvents(value: unknown): AlertEvent[] {
  if (!Array.isArray(value)) return [];
  const out: AlertEvent[] = [];
  for (const v of value) {
    if (!isObject(v)) continue;
    const id = typeof v.id === "string" ? v.id : "";
    const itemName = typeof v.itemName === "string" ? v.itemName : "";
    const op = v.op === "<" || v.op === "<=" || v.op === ">" || v.op === ">=" ? v.op : "<=";
    const threshold = typeof v.threshold === "number" ? v.threshold : 0;
    const price = typeof v.price === "number" ? v.price : 0;
    const triggeredAt = typeof v.triggeredAt === "string" ? v.triggeredAt : "";
    const readAt = v.readAt === null || typeof v.readAt === "string" ? (v.readAt as string | null) : null;
    if (!id || !itemName) continue;
    out.push({ id, itemName, op, threshold, price, triggeredAt, readAt });
  }
  return out;
}

function asWatches(value: unknown): WatchRow[] {
  if (!Array.isArray(value)) return [];
  const out: WatchRow[] = [];
  for (const v of value) {
    if (!isObject(v)) continue;
    const id = typeof v.id === "string" ? v.id : "";
    const itemName = typeof v.itemName === "string" ? v.itemName : "";
    const op = v.op === "<" || v.op === "<=" || v.op === ">" || v.op === ">=" ? v.op : "<=";
    const threshold = typeof v.threshold === "number" ? v.threshold : 0;
    const active = Boolean(v.active);
    if (!id || !itemName) continue;
    out.push({ id, itemName, op, threshold, active });
  }
  return out;
}

export function EconomyPage(props: { activeCharacterId: string | null; characters: AppCharacter[] }) {
  const active = props.activeCharacterId
    ? props.characters.find((c) => c.id === props.activeCharacterId) ?? null
    : null;

  const [server, setServer] = useState(() => active?.server ?? "");
  const [priceItemName, setPriceItemName] = useState("");
  const [priceValue, setPriceValue] = useState<number>(0);

  const [watchItemName, setWatchItemName] = useState("");
  const [watchOp, setWatchOp] = useState<"<" | "<=" | ">" | ">=">("<=");
  const [watchThreshold, setWatchThreshold] = useState<number>(0);

  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [watches, setWatches] = useState<WatchRow[]>([]);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (active?.server && !server) setServer(active.server);
  }, [active?.server, server]);

  const refresh = useMemo(
    () => async () => {
      setError(null);
      setNotice(null);
      const s = server.trim();
      if (!s) {
        setAlerts([]);
        setWatches([]);
        return;
      }
      try {
        const [rawAlerts, rawWatches] = await Promise.all([
          window.aion2Hub.economy.listAlerts({ server: s, unreadOnly: true, limit: 50 }),
          window.aion2Hub.economy.listWatches({ server: s })
        ]);
        setAlerts(asAlertEvents(rawAlerts));
        setWatches(asWatches(rawWatches));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "error");
        setAlerts([]);
        setWatches([]);
      }
    },
    [server]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitPrice() {
    const s = server.trim();
    const itemName = priceItemName.trim();
    if (!s) return setError("server_required");
    if (!itemName) return setError("item_required");
    setError(null);
    setNotice(null);
    try {
      const raw = await window.aion2Hub.economy.addPrice({ server: s, itemName, price: priceValue });
      const triggered = isObject(raw) ? asAlertEvents((raw as Record<string, unknown>).triggered) : [];
      setPriceItemName("");
      setPriceValue(0);
      if (triggered.length) setNotice(`알림 발생: ${triggered.length}건`);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    }
  }

  async function submitWatch() {
    const s = server.trim();
    const itemName = watchItemName.trim();
    if (!s) return setError("server_required");
    if (!itemName) return setError("item_required");
    setError(null);
    setNotice(null);
    try {
      await window.aion2Hub.economy.createWatch({ server: s, itemName, op: watchOp, threshold: watchThreshold });
      setWatchItemName("");
      setWatchThreshold(0);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Economy</h2>
          <p className="text-sm text-muted-foreground">서버별 수동 시세 입력 + 목표가 알림(앱 내부)</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="muted">local-only</Badge>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Server</CardTitle>
          <CardDescription>시세/알림은 서버별로 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="economy-server">Server</Label>
          <Input
            id="economy-server"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            placeholder={active?.server ? `예: ${active.server}` : "예: 이스라펠"}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>시세 입력</CardTitle>
            <CardDescription>아이템명 + 가격(키나)을 기록합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="economy-item-name">아이템</Label>
              <Input id="economy-item-name" value={priceItemName} onChange={(e) => setPriceItemName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="economy-item-price">가격 (키나)</Label>
              <Input
                id="economy-item-price"
                type="number"
                inputMode="numeric"
                value={Number.isFinite(priceValue) ? priceValue : 0}
                onChange={(e) => setPriceValue(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => void submitPrice()}>Add</Button>
              <Button variant="outline" onClick={() => void refresh()}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>목표가(Watch)</CardTitle>
            <CardDescription>시세를 입력할 때 조건을 만족하면 알림이 쌓입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="watch-item-name">아이템</Label>
              <Input id="watch-item-name" value={watchItemName} onChange={(e) => setWatchItemName(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="watch-op">조건</Label>
                <Select id="watch-op" value={watchOp} onChange={(e) => setWatchOp(e.target.value as "<" | "<=" | ">" | ">=")}>
                  <option value="<=">{"≤"}</option>
                  <option value="<">{"<"}</option>
                  <option value=">=">{"≥"}</option>
                  <option value=">">{">"}</option>
                </Select>
              </div>
              <div className="col-span-2 grid gap-2">
                <Label htmlFor="watch-threshold">목표가 (키나)</Label>
                <Input
                  id="watch-threshold"
                  type="number"
                  inputMode="numeric"
                  value={Number.isFinite(watchThreshold) ? watchThreshold : 0}
                  onChange={(e) => setWatchThreshold(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => void submitWatch()}>Add watch</Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">현재 Watch</div>
              {watches.length ? (
                <div className="space-y-2">
                  {watches.map((w) => (
                    <div key={w.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                      <span className="font-medium">{w.itemName}</span>
                      <Badge variant={w.active ? "secondary" : "muted"}>{w.active ? "on" : "off"}</Badge>
                      <span className="text-muted-foreground">
                        {w.op} {w.threshold.toLocaleString()}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            setError(null);
                            try {
                              await window.aion2Hub.economy.setWatchActive({ id: w.id, active: !w.active });
                              await refresh();
                            } catch (e: unknown) {
                              setError(e instanceof Error ? e.message : "error");
                            }
                          }}
                        >
                          {w.active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            const ok = window.confirm("삭제할까요?");
                            if (!ok) return;
                            setError(null);
                            try {
                              await window.aion2Hub.economy.deleteWatch({ id: w.id });
                              await refresh();
                            } catch (e: unknown) {
                              setError(e instanceof Error ? e.message : "error");
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">아직 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>알림</CardTitle>
          <CardDescription>읽지 않은 알림만 표시합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length ? (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                  <span className="font-medium">{a.itemName}</span>
                  <span className="text-muted-foreground">
                    {a.op} {a.threshold.toLocaleString()} (현재 {a.price.toLocaleString()})
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(a.triggeredAt)}</span>
                  <div className="ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setError(null);
                        try {
                          await window.aion2Hub.economy.markAlertRead({ id: a.id });
                          await refresh();
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : "error");
                        }
                      }}
                    >
                      Read
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">알림이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

