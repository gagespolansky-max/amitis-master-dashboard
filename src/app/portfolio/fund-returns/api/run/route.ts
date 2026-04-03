import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const CRON_RUNNER = '/Users/gage/fund-return-dashboard/venv/bin/python'
const CRON_SCRIPT = '/Users/gage/fund-return-dashboard/src/cron_runner.py'
const WORK_DIR = '/Users/gage/fund-return-dashboard'

export async function POST() {
  try {
    const { stdout, stderr } = await execAsync(
      `${CRON_RUNNER} ${CRON_SCRIPT}`,
      { cwd: WORK_DIR, timeout: 300_000 }
    )

    const output = (stdout + '\n' + stderr).trim()
    return NextResponse.json({ success: true, output })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
