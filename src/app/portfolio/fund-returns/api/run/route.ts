import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const CRON_RUNNER = '/Users/gage/fund-return-dashboard/venv/bin/python'
const CRON_SCRIPT = '/Users/gage/fund-return-dashboard/src/cron_runner.py'
const WORK_DIR = '/Users/gage/fund-return-dashboard'

export async function POST() {
  // Extractor only exists on Gage's Mac. On Vercel the daily 8am launchd
  // cron writes to Supabase; prod just reads.
  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Run Now is local-only. Fresh returns are pulled daily at 8am by the launchd job on your Mac. To trigger a manual run, use `npm run dev` locally or `python src/cron_runner.py` in ~/fund-return-dashboard/.',
      },
      { status: 503 }
    )
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      CRON_RUNNER,
      [CRON_SCRIPT],
      { cwd: WORK_DIR, timeout: 300_000 }
    )

    const output = (stdout + '\n' + stderr).trim()
    return NextResponse.json({ success: true, output })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
