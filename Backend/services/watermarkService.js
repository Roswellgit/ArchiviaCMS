const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');

exports.addWatermarkToPdf = async (fileBuffer, watermarkText = 'Archivia Protected') => {
  try {
    const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const fontSize = 60;
    const opacity = 0.3;
    const angle = 45;
    const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
    const textHeight = helveticaFont.heightAtSize(fontSize);

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      
      const angleRad = (angle * Math.PI) / 180;
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