// hooks/use-server-action.ts
'use client'

import { useTransition, useCallback } from 'react'
import { toast } from 'sonner'
import type { ActionResult } from '@/types'

interface Options<T> {
  onSuccess?: (data: T) => void
  onError?:   (error: string) => void
  successMessage?: string
  errorMessage?:   string
}

/**
 * Wraps a Server Action with useTransition + automatic toast feedback.
 *
 * Usage:
 *   const { execute, isPending } = useServerAction(suspendUser, {
 *     successMessage: 'Account suspended',
 *     onSuccess: () => router.refresh(),
 *   })
 *   <Button onClick={() => execute(userId)} disabled={isPending}>Suspend</Button>
 */
export function useServerAction<TArgs extends unknown[], TData>(
  action: (...args: TArgs) => Promise<ActionResult<TData>>,
  options: Options<TData> = {},
) {
  const [isPending, startTransition] = useTransition()

  const execute = useCallback(
    (...args: TArgs) => {
      startTransition(async () => {
        const result = await action(...args)

        if (!result.success) {
          const message = options.errorMessage ?? result.error
          toast.error(message)
          options.onError?.(result.error)
          return
        }

        if (options.successMessage) {
          toast.success(options.successMessage)
        }

        options.onSuccess?.(result.data)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action],
  )

  return { execute, isPending }
}
