import { useRef, useEffect, useState, useCallback } from "react";

/**
 * Helpful utility from: https://stackoverflow.com/a/60693711
 * 
 * A hook to fetch async data.
 * @class useAsync
 * @borrows useAsyncObject
 * @param {object} _                props
 * @param {async} _.asyncFunc         Promise like async function
 * @param {bool} _.immediate=false    Invoke the function immediately
 * @param {object} _.funcParams       Function initial parameters
 * @param {object} _.initialData      Initial data
 * @returns {useAsyncObject}        Async object
 * @example
 *   const { execute, loading, data, error } = useAync({
 *    asyncFunc: async () => { return 'data' },
 *    immediate: false,
 *    funcParams: { data: '1' },
 *    initialData: 'Hello'
 *  })
 */
export const useAsync = (props) => {
    const {
        asyncFunc, immediate, funcParams, initialData
    } = {
        ...props
    }
    const [loading, setLoading] = useState(immediate)
    const [data, setData] = useState(initialData)
    const [error, setError] = useState(null)
    const mountedRef = useRef(true)

    const execute = useCallback(params => {
        setLoading(true)
        return asyncFunc({ ...funcParams, ...params })
            .then(res => {
                if (!mountedRef.current) return null
                setData(res)
                setError(null)
                setLoading(false)
                return res
            })
            .catch(err => {
                if (!mountedRef.current) return null
                setError(err)
                setLoading(false)
                throw err
            })
    }, [asyncFunc, funcParams])

    useEffect(() => {
        if (immediate) {
            execute(funcParams)
        }
        return () => {
            mountedRef.current = false
        }
    }, [])

    return {
        execute,
        loading,
        data,
        error
    }
}