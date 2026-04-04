'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import CollateralCard from './collateral-card'
import type { CollateralFile } from '../api/folder/route'
import type { CardMeta } from './collateral-card'

type MetaMap = Record<string, CardMeta>

export default function CollateralsGrid() {
  const [files, setFiles] = useState<CollateralFile[]>([])
  const [metaMap, setMetaMap] = useState<MetaMap>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [filesRes, metaRes] = await Promise.all([
        fetch('/investor-relations/marketing-collaterals/api/folder', { cache: 'no-store' }),
        fetch('/investor-relations/marketing-collaterals/api/metadata'),
      ])

      if (!filesRes.ok) {
        const data = await filesRes.json()
        throw new Error(data.error || 'Failed to load collaterals')
      }

      const filesData: CollateralFile[] = await filesRes.json()
      setFiles(filesData)

      if (metaRes.ok) {
        setMetaMap(await metaRes.json())
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collaterals')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          {loading ? 'Scanning…' : `${files.length} file${files.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => fetchData(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Scan Folder
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading collaterals from Dropbox…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-card-border bg-card-bg p-6 text-center text-sm text-muted">
          {error}
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-card-border bg-card-bg p-6 text-center text-sm text-muted">
          No files found. Add files to the Dropbox collaterals folder to see them here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {files.map((file) => (
            <CollateralCard
              key={file.path}
              title={file.title}
              path={file.path}
              fileType={file.fileType}
              modified={file.modified}
              dropboxUrl={file.dropboxUrl}
              initialMeta={metaMap[file.path]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
