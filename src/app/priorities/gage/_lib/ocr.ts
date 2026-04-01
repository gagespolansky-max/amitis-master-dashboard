import { createWorker } from 'tesseract.js'

let workerInstance: Awaited<ReturnType<typeof createWorker>> | null = null

async function getWorker() {
  if (!workerInstance) {
    workerInstance = await createWorker('eng')
  }
  return workerInstance
}

export async function extractText(imageSource: string | File): Promise<string> {
  const worker = await getWorker()
  const { data } = await worker.recognize(imageSource)
  return data.text
}
