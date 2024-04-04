import { IBinaryData } from 'n8n-workflow';
import { PngPageOutput, pdfToPng } from 'pdf-to-png-converter';

const isPDFDocument = (data: IBinaryData) => data.mimeType === 'application/pdf';

const convertPdfToPng = async (buffer: Buffer, viewportScale: number) => {
	const pngPages: PngPageOutput[] = await pdfToPng(buffer, {
		viewportScale: viewportScale,
	})
	return pngPages;
}

export { isPDFDocument, convertPdfToPng };

