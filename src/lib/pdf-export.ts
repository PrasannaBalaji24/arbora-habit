import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Render a DOM element to a multi-page A4 PDF and trigger a download.
 * Captures the element at high resolution, then slices the image across pages.
 */
export async function exportElementToPDF(element: HTMLElement, filename: string) {
  // Snapshot the popover background (resolved CSS var) so html2canvas doesn't
  // choke on hsl(var(--...)) tokens in box-shadows etc.
  const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: bg,
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const usableWidth = pageWidth - margin * 2;
  const ratio = usableWidth / canvas.width;
  const imgHeight = canvas.height * ratio;
  const usablePageHeight = pageHeight - margin * 2;

  // Slice the source canvas vertically per PDF page so content doesn't get cut.
  const sourcePageHeightPx = usablePageHeight / ratio;
  let renderedHeight = 0;
  let pageIndex = 0;

  while (renderedHeight < canvas.height) {
    const sliceHeight = Math.min(sourcePageHeightPx, canvas.height - renderedHeight);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0, renderedHeight, canvas.width, sliceHeight,
      0, 0, canvas.width, sliceHeight,
    );
    const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, margin, usableWidth, sliceHeight * ratio);
    renderedHeight += sliceHeight;
    pageIndex++;
  }

  pdf.save(filename);
  void imgHeight; // silence unused
}
