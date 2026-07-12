import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

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
  try {
    const pdf = await buildPdf(elementId, size, orientation);
    pdf.save(filename);
  } catch (e) {
    console.error("PDF download failed", e);
    throw e;
  }
}

export async function printElementAsPdf(
  elementId: string,
  size: Size = "a4",
  orientation: Orient = "p",
) {
  const pdf = await buildPdf(elementId, size, orientation);
  const blobUrl = pdf.output("bloburl");
  const w = window.open(blobUrl, "_blank");
  if (!w) {
    // Popup blocked — fallback to iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = String(blobUrl);
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error(e);
      }
    };
    return;
  }
  w.addEventListener("load", () => {
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch (e) {
        console.error(e);
      }
    }, 300);
  });
}
