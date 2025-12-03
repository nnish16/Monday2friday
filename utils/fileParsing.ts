import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Use a robust CDN for the PDF worker (legacy build handles wider compatibility)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extracts text from a PDF file.
 */
const parsePDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore - type definitions might lag behind v4 changes
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
};

/**
 * Extracts text from a DOCX file.
 */
const parseDOCX = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

/**
 * Main parser function that delegates based on file type.
 */
export const parseDocument = async (file: File): Promise<string> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await parsePDF(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      fileName.endsWith('.docx')
    ) {
      return await parseDOCX(file);
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return await file.text();
    } else {
      throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
    }
  } catch (err: any) {
    console.error("File parsing error:", err);
    throw new Error(`Failed to read document: ${err.message}`);
  }
};