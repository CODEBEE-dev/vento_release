import { useState, useEffect, useCallback } from 'react'
import { API } from 'protobase'

export type System = {
    name: string
    content?: string
}

type UseSystemsResult = {
    systems: System[]
    loading: boolean
    error: string | null
    reload: () => void
}

export const useSystems = (): UseSystemsResult => {
    const [systems, setSystems] = useState<System[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSystems = useCallback(async () => {
        try {
            setError(null)

            const response = await API.get('/api/core/v1/systems/')

            if (response.isError) {
                setError(response.error || 'Error loading systems')
                return
            }

            const items = Array.isArray(response.data?.items)
                ? response.data.items
                : []

            setSystems(items)
        } catch (e: any) {
            console.error('Error fetching systems:', e)
            setError('Error loading systems')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchSystems() }, [fetchSystems])

    return { systems, loading, error, reload: fetchSystems }
}
