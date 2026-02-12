import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.svg";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <img src={logo} alt="inddd" className="h-12 w-auto mx-auto" />
        <p className="text-lg text-muted-foreground max-w-md">
          Clinic queue & visit-flow management — one live operational truth for your clinic day.
        </p>
        <div className="flex gap-3 justify-center pt-4">
          {user ? (
            <Button asChild>
              <Link to="/console">Open Console</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
