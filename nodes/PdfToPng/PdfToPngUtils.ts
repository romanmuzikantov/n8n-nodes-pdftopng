import { IBinaryData } from 'n8n-workflow';
import { PngPageOutput, pdfToPng } from 'pdf-to-png-converter';

const isPDFDocument = (data: IBinaryData) => data.mimeType === 'application/pdf';

const convertPdfToPng = async (buffer: Buffer) => {
	const pngPages: PngPageOutput[] = await pdfToPng(buffer)
	return pngPages;
}

export { isPDFDocument, convertPdfToPng };

