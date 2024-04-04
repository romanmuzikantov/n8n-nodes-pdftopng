import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeProperties,
	INodeType,
	IBinaryKeyData,
	IBinaryData,
	INodeTypeDescription,
	IPairedItemData,
	NodeOperationError,
} from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';
import { convertPdfToPng, isPDFDocument } from './PdfToPngUtils';

const nodeOperationOptions: INodeProperties[] = [
	{
		displayName: 'Property Name In',
		name: 'dataPropertyName1',
		type: 'string',
		default: 'data',
		description:
			'Name of the binary property passed as input.',
	},
	{
		displayName: 'Property Name Out',
		name: 'dataPropertyNameOut',
		type: 'string',
		default: 'data',
		description: 'Name of the binary property where the converted document will be output',
	},
];

export class PdfToPng implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Convert PDF to PNG',
		name: 'pdfToPng',
		icon: 'file:merge.svg',
		group: ['transform'],
		version: 1,
		description: 'Converts a PDF file to a PNG image.',
		defaults: {
			name: 'Convert PDF to PNG',
		},
		inputs: ['main'],
		inputNames: ['Document 1'],
		outputs: ['main'],
		properties: [...nodeOperationOptions],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items1 = this.getInputData(0);
		let itemBinaryData1: IBinaryKeyData;
		let docBinaryData: IBinaryData;

		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items1.length; itemIndex++) {
			const dataPropertyName1 = this.getNodeParameter('dataPropertyName1', itemIndex) as string;
			const dataPropertyNameOut = this.getNodeParameter('dataPropertyNameOut', itemIndex) as string;
			const item1 = items1[itemIndex];

			try {
				itemBinaryData1 = items1[itemIndex].binary as IBinaryKeyData;
				docBinaryData = itemBinaryData1[dataPropertyName1] as IBinaryData;

				if (!isPDFDocument(docBinaryData)) {
					// Sanity check: only allow PDFs
					throw new NodeOperationError(
						this.getNode(),
						`Input 1 (on binary property "${dataPropertyName1}") should be a PDF file, was ${docBinaryData.mimeType} instead`,
						{ itemIndex },
					);
				}

				let fileContent1: Buffer;

				if (docBinaryData.id) {
					fileContent1 = await this.helpers.binaryToBuffer(
						this.helpers.getBinaryStream(docBinaryData.id),
					);
				} else {
					fileContent1 = Buffer.from(docBinaryData.data, BINARY_ENCODING);
				}

				const pngPagesOutput = await convertPdfToPng(fileContent1);

				let binaryDataOutput = await Promise.all(pngPagesOutput.map((value, index, arr) => {
					return this.helpers.prepareBinaryData(
						value.content,
						value.name,
						'image/png'
					)
				}))

				let binaryKeyDataOutput: IBinaryKeyData = {};

				binaryDataOutput.forEach((value, index) => {
					binaryKeyDataOutput[dataPropertyNameOut + index] = value;
				})

				// Add the rendered file in a new property
				returnData.push({
					json: {
						...item1.json,
					},
					binary: {
						...binaryKeyDataOutput,
					},
					pairedItem: [item1.pairedItem as IPairedItemData],
				});
			} catch (error) {
				if (this.continueOnFail()) {
					// Carry on with the data that was provided as input (short-circuit the node)
					returnData.push({
						json: {
							...item1.json,
						},
						binary: {
							...item1.binary,
						},
						pairedItem: [item1.pairedItem as IPairedItemData],
					});
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
