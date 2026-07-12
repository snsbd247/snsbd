import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { toast } from "sonner";

type Size = "a4" | "a5";
type Orient = "p" | "l";

async function buildPdf(elementId: string, size: Size, orientation: Orient) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element #${elementId} not found`);

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
  }
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

    iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe!.contentWindow?.focus();
          iframe!.contentWindow?.print();
          toast.success("Print dialog opened", { id: tid });
        } catch (err: any) {
          console.error("Print failed", err);
          toast.error(`Print failed: ${err?.message ?? err}`, { id: tid });
        }
      }, 300);
    };
    iframe.onerror = (err) => {
      console.error("PDF load failed", err);
      toast.error("Could not load PDF for print", { id: tid });
      if (iframe) document.body.removeChild(iframe);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  } catch (e: any) {
    console.error("PDF print failed", e);
    toast.error(`PDF print failed: ${e?.message ?? e}`, { id: tid });
    if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
}
