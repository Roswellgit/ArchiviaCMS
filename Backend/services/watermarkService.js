const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');

exports.addWatermarkToPdf = async (fileBuffer, watermarkText = 'Archivia Protected') => {
  try {
    const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    // Settings
    const fontSize = 60;
    const opacity = 0.3;
    const angle = 45; 

    // 1. Calculate the width of the text
    const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
    const textHeight = helveticaFont.heightAtSize(fontSize);

    pages.forEach((page) => {
      const { width, height } = page.getSize();

      // 2. MATH: Calculate the "Pull Back" values
      // We want the text to pass through the center, so we calculate where it needs 
      // to start based on the 45-degree angle.
      
      const angleRad = (angle * Math.PI) / 180; // Convert 45 degrees to radians
      
      // Basic Trig: adjusting X and Y to shift the center of the text to the center of the page
      const x = (width / 2) - (textWidth / 2) * Math.cos(angleRad);
      const y = (height / 2) - (textWidth / 2) * Math.sin(angleRad);

      page.drawText(watermarkText, {
        x: x,
        y: y,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.6, 0.6, 0.6),
        opacity: opacity,
        rotate: degrees(angle),
      });
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error("❌ Watermark Service Failed:", error.message);
    throw error;
  }
};