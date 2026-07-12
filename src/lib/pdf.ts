import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { toast } from "sonner";

type Size = "a4" | "a5";
type Orient = "p" | "l";

async function buildPdf(elementId: string, size: Size, orientation: Orient) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element #${elementId} not found`);

  // Ensure webfonts (incl. Bengali) are loaded so html2canvas rasterises them correctly
  try {
    if (document.fonts && (document.fonts as any).ready) {
      await (document.fonts as any).ready;
    }
  } catch {
    /* ignore */
  }

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const pdf = new jsPDF(orientation, "mm", size);
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const imgData = canvas.toDataURL("image/png");

  let heightLeft = imgH;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position = heightLeft - imgH;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
    heightLeft -= pageH;
  }
  return pdf;
}

export async function downloadElementAsPdf(
  elementId: string,
  filename: string,
  size: Size = "a4",
  orientation: Orient = "p",
) {
  const tid = toast.loading("Generating PDF…");
  try {
    const pdf = await buildPdf(elementId, size, orientation);
    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    toast.success("PDF downloaded", { id: tid });
  } catch (e: any) {
    console.error("PDF download failed", e);
    toast.error(`PDF download failed: ${e?.message ?? e}`, { id: tid });
    throw e;
  }
}

function printViaWindow(blobUrl: string, tid: string | number) {
  const win = window.open(blobUrl, "_blank");
  if (!win) {
    toast.error("Popup blocked. Allow popups to print, or use Download PDF.", { id: tid });
    return false;
  }
  const tryPrint = () => {
    try {
      win.focus();
      win.print();
      toast.success("Print dialog opened", { id: tid });
    } catch (err: any) {
      console.error("Window print failed", err);
      toast.error(`Print failed: ${err?.message ?? err}`, { id: tid });
    }
  };
  // Give the PDF viewer a moment to render before invoking print
  win.addEventListener("load", () => setTimeout(tryPrint, 500));
  setTimeout(tryPrint, 1500);
  return true;
}

export async function printElementAsPdf(
  elementId: string,
  size: Size = "a4",
  orientation: Orient = "p",
) {
  const tid = toast.loading("Preparing PDF for print…");
  let iframe: HTMLIFrameElement | null = null;
  let blobUrl: string | null = null;
  try {
    const pdf = await buildPdf(elementId, size, orientation);
    const blob = pdf.output("blob");
    blobUrl = URL.createObjectURL(blob);

    // Mobile / Safari often can't print PDFs from a hidden iframe — go straight to window.open
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (isMobile || isSafari) {
      printViaWindow(blobUrl, tid);
      return;
    }

    iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    let printed = false;
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe!.contentWindow?.focus();
          iframe!.contentWindow?.print();
          printed = true;
          toast.success("Print dialog opened", { id: tid });
        } catch (err: any) {
          console.error("Iframe print blocked, falling back to window.open", err);
          if (blobUrl) printViaWindow(blobUrl, tid);
        }
      }, 400);
    };
    iframe.onerror = (err) => {
      console.error("PDF iframe load failed, falling back to window.open", err);
      if (blobUrl) printViaWindow(blobUrl, tid);
    };
    // Safety net: if the iframe never fires load, fall back
    setTimeout(() => {
      if (!printed && blobUrl) printViaWindow(blobUrl, tid);
    }, 3000);
  } catch (e: any) {
    console.error("PDF print failed", e);
    toast.error(`PDF print failed: ${e?.message ?? e}`, { id: tid });
    if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    throw e;
  }
}
