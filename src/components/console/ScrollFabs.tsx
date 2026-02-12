import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

export function ScrollFabs() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 md:hidden">
      <Button
        size="icon"
        variant="secondary"
        className="h-11 w-11 rounded-full shadow-lg"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="h-11 w-11 rounded-full shadow-lg"
        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
      >
        <ArrowDown className="h-5 w-5" />
      </Button>
    </div>
  );
}
