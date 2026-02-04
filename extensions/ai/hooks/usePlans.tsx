import { useState, useEffect, useCallback } from 'react'
import { API } from 'protobase'

export type Plan = {
    name: string
    content?: string
}

type UsePlansResult = {
    plans: Plan[]
    loading: boolean
    error: string | null
    reload: () => void
}

export const usePlans = (): UsePlansResult => {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPlans = useCallback(async () => {
        try {
            setError(null)

            const response = await API.get('/api/core/v1/plans/')

            if (response.isError) {
                setError(response.error || 'Error loading plans')
                return
            }

            const items = Array.isArray(response.data?.items)
                ? response.data.items
                : []

            setPlans(items)
        } catch (e: any) {
            console.error('Error fetching plans:', e)
            setError('Error loading plans')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchPlans() }, [fetchPlans])

    return { plans, loading, error, reload: fetchPlans }
}
