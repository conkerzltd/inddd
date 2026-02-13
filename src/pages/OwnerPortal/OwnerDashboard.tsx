import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/i18n/useLocale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  Users,
  Building2,
  BarChart3,
  CheckCircle,
  LogOut,
} from "lucide-react";

const OwnerDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { localePath } = useLocale();

  const handleSignOut = async () => {
    await signOut();
    navigate(localePath("/owner-portal/login"));
  };

  const menuItems = [
    {
      title: "إدارة المسوقين",
      description: "إضافة وتعديل وتعطيل المسوقين وأكواد الإحالة",
      icon: Users,
      path: "/owner-portal/marketers",
      available: true,
    },
    {
      title: "الموافقات",
      description: "مراجعة العيادات الجديدة والموافقة عليها",
      icon: CheckCircle,
      path: "/owner-portal/approvals",
      available: true,
    },
    {
      title: "إدارة العيادات",
      description: "عرض وإدارة كل العيادات والأطباء",
      icon: Building2,
      path: "/owner-portal/clinics",
      available: false,
    },
    {
      title: "التحليلات",
      description: "إحصائيات الأداء ولوحة المتابعة",
      icon: BarChart3,
      path: "/owner-portal/analytics",
      available: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">بوابة الإدارة</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 me-1" />
            خروج
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            مرحباً بك في لوحة التحكم
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة المسوقين والعيادات والموافقات من مكان واحد
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {menuItems.map((item) => (
            <Card
              key={item.title}
              className={`transition-shadow hover:shadow-md ${
                item.available
                  ? "cursor-pointer"
                  : "opacity-60 cursor-not-allowed"
              }`}
              onClick={() =>
                item.available && navigate(localePath(item.path))
              }
            >
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
                {!item.available && (
                  <span className="mt-2 inline-block text-xs text-muted-foreground/70">
                    قريباً
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
