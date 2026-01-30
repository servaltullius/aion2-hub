import { useState } from "react";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { isObject } from "../lib/guards.js";

export function SettingsBackupPage() {
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Backup</h2>
        <p className="text-sm text-muted-foreground">
          데이터는 EXE 옆 `./data/aion2-hub.sqlite`에 저장됩니다. 아래는 JSON 백업(내보내기/가져오기)입니다.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>JSON Backup</CardTitle>
            <Badge variant="muted">local-only</Badge>
          </div>
          <CardDescription>Export는 파일을 만들고 폴더를 엽니다. Import는 현재 replace 방식입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                setError(null);
                try {
                  const raw = await window.aion2Hub.backup.exportJson();
                  const filePath = isObject(raw) && typeof raw.filePath === "string" ? raw.filePath : null;
                  setLastExport(filePath);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "export_failed");
                }
              }}
            >
              Export JSON
            </Button>

            <Button
              variant="outline"
              onClick={async () => {
                setError(null);
                try {
                  const ok = window.confirm(
                    "Import는 현재 replace 방식입니다. (캐릭터/플래너/수집/세팅 등이 백업 파일 기준으로 교체될 수 있습니다)\n\n계속할까요?"
                  );
                  if (!ok) return;
                  const raw = await window.aion2Hub.backup.importJson();
                  const canceled = isObject(raw) && typeof raw.canceled === "boolean" ? raw.canceled : false;
                  const filePath = isObject(raw) && typeof raw.filePath === "string" ? raw.filePath : null;
                  if (!canceled) setLastImport(filePath);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "import_failed");
                }
              }}
            >
              Import JSON (replace)
            </Button>
          </div>

          {lastExport ? (
            <p className="text-xs text-muted-foreground">
              last export: <code className="font-mono">{lastExport}</code>
            </p>
          ) : null}
          {lastImport ? (
            <p className="text-xs text-muted-foreground">
              last import: <code className="font-mono">{lastImport}</code>
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Import는 현재 <b>replace</b> 방식(기존 캐릭터/플래너 데이터 교체)으로 동작합니다.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
