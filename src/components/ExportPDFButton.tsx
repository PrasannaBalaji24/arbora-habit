import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { exportElementToPDF } from "@/lib/pdf-export";
import { toast } from "@/hooks/use-toast";

interface Props {
  targetRef: React.RefObject<HTMLElement>;
  filename: string;
  label?: string;
}

export default function ExportPDFButton({ targetRef, filename, label = "Export PDF" }: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!targetRef.current || busy) return;
    setBusy(true);
    try {
      await exportElementToPDF(targetRef.current, filename);
      toast({ title: "PDF ready", description: `Saved ${filename}` });
    } catch (e) {
      console.error(e);
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleClick} size="sm" disabled={busy} className="btn-glossy border-0 gap-2">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {busy ? "Generating..." : label}
    </Button>
  );
}
