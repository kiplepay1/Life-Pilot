import { createWorker } from 'tesseract.js'

/**
 * Runs free, on-device OCR (Tesseract.js) over an image file and
 * returns the raw recognized text. Nothing here is uploaded anywhere —
 * the image never leaves the browser. Tesseract's trained-data file
 * (a few MB) downloads from its public CDN the first time this runs
 * per browser session; after that it's cached.
 *
 * This is plain text recognition, not an AI model reading the image's
 * meaning — see src/utils/grabScreenshotParser.ts for the pattern
 * matching that turns this text into session fields, and always show
 * the result to the user for review before saving.
 */
export async function recognizeImageText(file: File): Promise<string> {
  const worker = await createWorker('eng')
  try {
    const {
      data: { text },
    } = await worker.recognize(file)
    return text
  } finally {
    await worker.terminate()
  }
}
