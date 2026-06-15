import { useEffect } from 'react'

export interface ToastMessage {
  id: string
  text: string
  type: 'info' | 'error' | 'warning'
}

interface ToastProps {
  message: ToastMessage
  onDismiss: (id: string) => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(message.id), 5000)
    return () => clearTimeout(timer)
  }, [message.id, onDismiss])

  const bgColor = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
  }[message.type]

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${bgColor}`}>
      {message.text}
    </div>
  )
}

interface ToastContainerProps {
  messages: ToastMessage[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ messages, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-24 left-0 right-0 mx-auto max-w-md space-y-2 px-4 safe-bottom">
      {messages.map((m) => (
        <Toast key={m.id} message={m} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
