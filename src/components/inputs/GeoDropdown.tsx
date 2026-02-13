import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface GeoValue {
  governorate_ar: string;
  level2_ar: string;
  level2_type: string;
  level3_ar: string;
}

interface GeoDropdownProps {
  value: GeoValue;
  onChange: (v: GeoValue) => void;
  /** Show village (level3) field when level2 is MARKAZ */
  showVillage?: boolean;
  errors?: Partial<Record<keyof GeoValue, string>>;
  disabled?: boolean;
}

const typeLabel = (t: string) =>
  t === "MARKAZ" ? "مركز" : t === "CITY" ? "مدينة" : "حي";

export function GeoDropdown({
  value,
  onChange,
  showVillage = true,
  errors,
  disabled = false,
}: GeoDropdownProps) {
  const [governorates, setGovernorates] = useState<string[]>([]);
  const [level2Options, setLevel2Options] = useState<
    { level2_ar: string; level2_type: string }[]
  >([]);
  const [villageOptions, setVillageOptions] = useState<string[]>([]);
  const [showVillageOther, setShowVillageOther] = useState(false);
  const [villageOther, setVillageOther] = useState("");

  // Load governorates once
  useEffect(() => {
    supabase
      .from("geo_localities")
      .select("governorate_ar")
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((r) => r.governorate_ar))].sort(
            (a, b) => a.localeCompare(b, "ar")
          );
          setGovernorates(unique);
        }
      });
  }, []);

  // Load level2 when gov changes
  useEffect(() => {
    if (!value.governorate_ar) {
      setLevel2Options([]);
      return;
    }
    supabase
      .from("geo_localities")
      .select("level2_ar, level2_type")
      .eq("governorate_ar", value.governorate_ar)
      .is("level3_ar", null)
      .then(({ data }) => {
        if (data) {
          const seen = new Set<string>();
          const unique = data.filter((r) => {
            const key = `${r.level2_ar}|${r.level2_type}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setLevel2Options(
            unique.sort((a, b) => a.level2_ar.localeCompare(b.level2_ar, "ar"))
          );
        }
      });
  }, [value.governorate_ar]);

  // Load villages when level2 is MARKAZ
  useEffect(() => {
    if (
      !showVillage ||
      !value.governorate_ar ||
      !value.level2_ar ||
      value.level2_type !== "MARKAZ"
    ) {
      setVillageOptions([]);
      return;
    }
    supabase
      .from("geo_localities")
      .select("level3_ar")
      .eq("governorate_ar", value.governorate_ar)
      .eq("level2_ar", value.level2_ar)
      .not("level3_ar", "is", null)
      .then(({ data }) => {
        if (data) {
          const villages = data
            .map((r) => r.level3_ar!)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "ar"));
          setVillageOptions(villages);
          if (villages.length === 0) setShowVillageOther(true);
        }
      });
  }, [showVillage, value.governorate_ar, value.level2_ar, value.level2_type]);

  const handleGovChange = (gov: string) => {
    onChange({ governorate_ar: gov, level2_ar: "", level2_type: "", level3_ar: "" });
    setShowVillageOther(false);
    setVillageOther("");
  };

  const handleLevel2Change = (val: string) => {
    const [l2, type] = val.split("|");
    onChange({ ...value, level2_ar: l2, level2_type: type, level3_ar: "" });
    setShowVillageOther(false);
    setVillageOther("");
  };

  const handleVillageChange = (val: string) => {
    if (val === "__other__") {
      setShowVillageOther(true);
      onChange({ ...value, level3_ar: "" });
    } else {
      setShowVillageOther(false);
      setVillageOther("");
      onChange({ ...value, level3_ar: val });
    }
  };

  return (
    <div className="space-y-3">
      {/* Governorate */}
      <div className="space-y-2">
        <Label>المحافظة</Label>
        <Select
          value={value.governorate_ar}
          onValueChange={handleGovChange}
          disabled={disabled}
        >
          <SelectTrigger dir="rtl">
            <SelectValue placeholder="اختر المحافظة" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {governorates.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.governorate_ar && (
          <p className="text-sm text-destructive">{errors.governorate_ar}</p>
        )}
      </div>

      {/* Level 2 */}
      {value.governorate_ar && (
        <div className="space-y-2">
          <Label>المدينة / المركز / الحي</Label>
          <Select
            value={
              value.level2_ar
                ? `${value.level2_ar}|${value.level2_type}`
                : ""
            }
            onValueChange={handleLevel2Change}
            disabled={disabled}
          >
            <SelectTrigger dir="rtl">
              <SelectValue placeholder="اختر" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {level2Options.map((opt) => (
                <SelectItem
                  key={`${opt.level2_ar}|${opt.level2_type}`}
                  value={`${opt.level2_ar}|${opt.level2_type}`}
                >
                  <span className="flex items-center gap-2">
                    {opt.level2_ar}
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {typeLabel(opt.level2_type)}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.level2_ar && (
            <p className="text-sm text-destructive">{errors.level2_ar}</p>
          )}
        </div>
      )}

      {/* Village (Level 3) */}
      {showVillage &&
        value.level2_ar &&
        value.level2_type === "MARKAZ" && (
          <div className="space-y-2">
            <Label>القرية (اختياري)</Label>
            {villageOptions.length > 0 ? (
              <Select
                value={showVillageOther ? "__other__" : value.level3_ar}
                onValueChange={handleVillageChange}
                disabled={disabled}
              >
                <SelectTrigger dir="rtl">
                  <SelectValue placeholder="اختر القرية (اختياري)" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {villageOptions.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                  <SelectItem value="__other__">
                    أخرى / غير مدرجة
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                لا توجد قرى. أدخل يدوياً:
              </p>
            )}
            {(showVillageOther || villageOptions.length === 0) && (
              <Input
                value={villageOther}
                onChange={(e) => {
                  setVillageOther(e.target.value);
                  onChange({ ...value, level3_ar: e.target.value });
                }}
                placeholder="أدخل اسم القرية"
                dir="rtl"
                className="mt-2"
                disabled={disabled}
              />
            )}
            {errors?.level3_ar && (
              <p className="text-sm text-destructive">{errors.level3_ar}</p>
            )}
          </div>
        )}
    </div>
  );
}
