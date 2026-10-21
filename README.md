# Transferly
Ivey NVP repo

The application is in `lovable code/95fa4b77-3d3f-417a-bc20-55f070b89044`.

```powershell
cd 'lovable code/95fa4b77-3d3f-417a-bc20-55f070b89044'
npm ci --legacy-peer-deps
npm run dev
```

Open the local URL printed by Vite, then choose **New Transfer**:

1. Select an identification image/PDF and an investment statement.
2. Optionally select multiple supporting documents, including bank details.
3. Click **Scan Documents**. Review the extracted text, correct values, and complete blank fields.
4. Select transfer instructions. Enable the EFT form if needed and review its bank details.
5. Click **Prepare Transfer Form**, then **Preview completed PDFs** or **Download draft forms**.
6. Resolve address discrepancies and failed checks, then confirm the final review.

Downloads include a summary and the supplied transfer authorization PDF, plus the TFSA or FHSA application when applicable, and the optional EFT form. The packet is an unsigned, flattened draft. SIN, beneficiary elections, signatures, dealer codes, and unsupported application details remain for advisor completion. No transfer is submitted. The dashboard remains seeded demonstration data; uploaded client information is not added to persistent storage.

Scanning uses PDF.js for searchable PDFs and Tesseract for images or scanned PDF pages. Processing runs in the browser; the first OCR run needs internet access to download worker/language assets. Files and extracted values remain in memory and disappear on refresh or navigation away. English OCR and conservative label matching are supported, including the provided Wealthsimple statement and CIBC deposit-detail layouts. Unrecognized fields remain blank. Use **Use Demo Documents** for the original synthetic workflow.

Only the four blank `Transferly_*.pdf` templates are copied into `public/forms`; the personal documents in `images` are never bundled or automatically uploaded.

Validation commands: `npm test`, `npx tsc --noEmit`, and `npm run build`.
