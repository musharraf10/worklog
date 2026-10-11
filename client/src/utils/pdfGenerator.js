import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export an HTML element as a multi-page PDF document with clickable hyperlinks
 */
export const exportReportToPdf = async (
  elementId,
  fileName = 'Impact_Appraisal_Report.pdf',
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Temporarily tweak width for consistent canvas rendering
  const originalWidth = element.style.width;
  element.style.width = '1000px';

  try {
    // Collect clickable link bounding boxes relative to container
    const elementRect = element.getBoundingClientRect();
    const linkElements = Array.from(element.querySelectorAll('a[href]'));
    const linkData = linkElements.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        url: el.href,
        left: rect.left - elementRect.left,
        top: rect.top - elementRect.top,
        width: rect.width,
        height: rect.height,
      };
    });

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#f6f5f0',
    });

    element.style.width = originalWidth;

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 page width in mm
    const pageHeight = 297; // A4 page height in mm
    const elementPxWidth = element.offsetWidth || 1000;
    const mmPerPx = imgWidth / elementPxWidth;

    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    let pageCount = 1;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');

    // Add subsequent pages if document overflows A4
    while (heightLeft > pageHeight) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
      pageCount++;
    }

    // Embed clickable link annotations across corresponding PDF pages
    linkData.forEach((link) => {
      if (!link.url || link.width <= 0 || link.height <= 0) return;
      const topMm = link.top * mmPerPx;
      const leftMm = link.left * mmPerPx;
      const widthMm = Math.max(1, link.width * mmPerPx);
      const heightMm = Math.max(1, link.height * mmPerPx);

      const targetPage = Math.floor(topMm / pageHeight) + 1;
      if (targetPage <= pageCount) {
        pdf.setPage(targetPage);
        const yOnPage = topMm % pageHeight;
        pdf.link(leftMm, yOnPage, widthMm, heightMm, { url: link.url });
      }
    });

    pdf.save(fileName);
    return true;
  } catch (error) {
    element.style.width = originalWidth;
    console.error('PDF generation error, falling back to window.print():', error);
    window.print();
    return false;
  }
};

/**
 * Native clean print dialog trigger
 */
export const triggerPrintReport = () => {
  window.print();
};
