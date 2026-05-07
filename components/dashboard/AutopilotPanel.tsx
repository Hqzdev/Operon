"use client";

import { useState } from "react";
import { Bot, Cable, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

const steps = [
  {
    num: 1,
    title: "Синхронизирует метрики каждый день",
    body: "Autopilot автоматически забирает свежие данные из Meta, TikTok и Shopify каждые 24 часа — без ручного ввода.",
  },
  {
    num: 2,
    title: "Запускает анализ по каждому продукту",
    body: "Каждый товар и рекламный сет оценивается движком решений. Вердикт SCALE / KILL / WATCH формируется без участия пользователя.",
  },
  {
    num: 3,
    title: "Отправляет еженедельный дайджест",
    body: "Итоги приходят на почту каждый понедельник. Только изменившиеся решения — никакого шума.",
  },
  {
    num: 4,
    title: "Оповещает о критических падениях",
    body: "Если ROAS опускается ниже точки безубыточности, вы получаете уведомление немедленно.",
  },
];

export function AutopilotPanel() {
  const [enabled, setEnabled] = useState(false);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent">
          <Bot className="size-3.5 text-muted-foreground" />
          Autopilot
          <span className={`size-2 rounded-full transition-colors ${enabled ? "bg-[#10B981]" : "bg-muted"}`} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0"
      >
        <div className="border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-muted-foreground" />
            <span className="text-[14px] font-semibold">Autopilot</span>
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-medium">Включить Autopilot</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Авто-анализ рекламных кампаний</div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="Toggle Autopilot"
            />
          </div>
        </div>

        <div className="mx-4 mb-3.5 flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <Cable className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div>
            <div className="text-[12px] font-medium">Нужна интеграция</div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Autopilot требует хотя бы одного подключённого аккаунта Meta, TikTok или Shopify.
            </div>
          </div>
        </div>

        <div className="border-t border-border px-4 py-3.5">
          <button className="mb-3 flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Info className="size-3" />
            Как работает Autopilot
          </button>
          <ol className="space-y-3">
            {steps.map((step) => (
              <li key={step.num} className="flex gap-2.5">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {step.num}
                </span>
                <div>
                  <div className="text-[12px] font-medium leading-snug">{step.title}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{step.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </PopoverContent>
    </Popover>
  );
}
