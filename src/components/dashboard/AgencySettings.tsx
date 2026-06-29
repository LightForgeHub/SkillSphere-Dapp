"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Slider, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/components/ui/utils";

interface AgencySettingsProps {
  initialExpertSplit?: number;
  initialAgencySplit?: number;
  onSave?: (expertSplit: number, agencySplit: number) => void;
}

export default function AgencySettings({
  initialExpertSplit = 80,
  initialAgencySplit = 20,
  onSave,
}: AgencySettingsProps) {
  const [expertSplit, setExpertSplit] = useState(initialExpertSplit);
  const [agencySplit, setAgencySplit] = useState(initialAgencySplit);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setExpertSplit(initialExpertSplit);
    setAgencySplit(initialAgencySplit);
  }, [initialExpertSplit, initialAgencySplit]);

  const handleExpertChange = (value: number) => {
    const newAgency = 100 - value;
    if (newAgency < 0) {
      setError("Agency split cannot be negative");
      return;
    }
    setExpertSplit(value);
    setAgencySplit(newAgency);
    setError(null);
    setSaved(false);
  };

  const handleAgencyChange = (value: number) => {
    const newExpert = 100 - value;
    if (newExpert < 0) {
      setError("Expert split cannot be negative");
      return;
    }
    setAgencySplit(value);
    setExpertSplit(newExpert);
    setError(null);
    setSaved(false);
  };

  const handleSave = () => {
    if (expertSplit + agencySplit !== 100) {
      setError("Total split must equal 100%");
      return;
    }
    setError(null);
    setSaved(true);
    onSave?.(expertSplit, agencySplit);
  };

  return (
    <Card className="p-0 overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Slider className="size-5 text-purple-400" />
          </div>
          <CardTitle className="text-lg">Revenue Split Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <p className="text-sm text-white/60">
          Configure how session earnings are distributed between the platform, your agency, and the expert.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white/80">
                Expert Split
              </label>
              <Badge variant="success" className="text-xs font-mono">
                {expertSplit}%
              </Badge>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={expertSplit}
              onChange={(e) => handleExpertChange(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-white/40">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white/80">
                Agency Split
              </label>
              <Badge variant="info" className="text-xs font-mono">
                {agencySplit}%
              </Badge>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={agencySplit}
              onChange={(e) => handleAgencyChange(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-white/40">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-white/50">Total Distribution</span>
            <span
              className={cn(
                "text-2xl font-bold font-mono tabular-nums",
                expertSplit + agencySplit === 100
                  ? "text-white"
                  : "text-red-400"
              )}
            >
              {expertSplit + agencySplit}%
            </span>
          </div>
          <Badge
            variant={expertSplit + agencySplit === 100 ? "success" : "destructive"}
            className="text-xs"
          >
            {expertSplit + agencySplit === 100 ? "Balanced" : "Invalid Total"}
          </Badge>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertTriangle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {saved && !error && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle className="size-4 shrink-0" />
            Revenue split saved successfully
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setExpertSplit(initialExpertSplit);
              setAgencySplit(initialAgencySplit);
              setError(null);
              setSaved(false);
            }}
          >
            Reset
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <CheckCircle className="size-4" />
            Save Split
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
