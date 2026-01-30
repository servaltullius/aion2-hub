import type { PlannerTemplateType } from "./model.js";

import { Button } from "../../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card.js";
import { Input } from "../../../components/ui/input.js";
import { Label } from "../../../components/ui/label.js";
import { Select } from "../../../components/ui/select.js";

export function EditTemplateCard({
  editTitle,
  editType,
  editEstimateMinutes,
  editRechargeHours,
  editMaxStacks,
  onEditTitleChange,
  onEditTypeChange,
  onEditEstimateMinutesChange,
  onEditRechargeHoursChange,
  onEditMaxStacksChange,
  onSave,
  onCancel
}: {
  editTitle: string;
  editType: PlannerTemplateType;
  editEstimateMinutes: number;
  editRechargeHours: number;
  editMaxStacks: number;
  onEditTitleChange: (title: string) => void;
  onEditTypeChange: (type: PlannerTemplateType) => void;
  onEditEstimateMinutesChange: (minutes: number) => void;
  onEditRechargeHoursChange: (hours: number) => void;
  onEditMaxStacksChange: (stacks: number) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>수정</CardTitle>
        <CardDescription>템플릿 정보를 수정합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>이름</Label>
            <Input value={editTitle} onChange={(e) => onEditTitleChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>유형</Label>
            <Select value={editType} onChange={(e) => onEditTypeChange(e.target.value as PlannerTemplateType)}>
              <option value="DAILY">DAILY</option>
              <option value="WEEKLY">WEEKLY</option>
              <option value="CHARGE">CHARGE</option>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>예상(분)</Label>
            <Input type="number" min={0} value={editEstimateMinutes} onChange={(e) => onEditEstimateMinutesChange(Number(e.target.value))} />
          </div>

          {editType === "CHARGE" ? (
            <>
              <div className="space-y-2">
                <Label>충전(시간)</Label>
                <Input type="number" min={1} value={editRechargeHours} onChange={(e) => onEditRechargeHoursChange(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>최대 스택</Label>
                <Input type="number" min={1} value={editMaxStacks} onChange={(e) => onEditMaxStacksChange(Number(e.target.value))} />
              </div>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onSave}>
            저장
          </Button>
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
