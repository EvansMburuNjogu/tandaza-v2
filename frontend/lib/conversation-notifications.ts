import { toast } from "sonner"
import type { ExhibitorConversationThread } from "@/lib/api/contracts"

let audioContext: AudioContext | null = null
let lastSoundAt = 0

export function playConversationNotificationSound() {
  if (typeof window === "undefined") return
  const now = Date.now()
  if (now - lastSoundAt < 900) return
  lastSoundAt = now

  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    audioContext = audioContext || new AudioCtx()
    const context = audioContext
    if (context.state === "suspended") {
      void context.resume()
    }

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(740, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(920, context.currentTime + 0.08)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.24)
  } catch {
    // Browsers may block audio until the user interacts with the page.
  }
}

export function notifyIncomingConversationMessage(thread: ExhibitorConversationThread) {
  playConversationNotificationSound()
  const latest = lastMessage(thread)
  const sender = latest?.senderName || thread.visitorName || thread.exhibitorName || "New message"
  const message = thread.lastMessage || latest?.message || "Open the conversation to reply."
  toast.message(`New message from ${sender}`, {
    description: message.length > 90 ? `${message.slice(0, 87)}...` : message
  })

  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return
  try {
    new Notification(`New message from ${sender}`, {
      body: message,
      tag: `tandaza-chat-${thread.id}`,
      silent: true
    })
  } catch {
    // Some browsers deny Notification construction in private or restricted contexts.
  }
}

export function latestIncomingConversationMessages(threads: ExhibitorConversationThread[], incomingRole: "visitor" | "exhibitor") {
  return threads
    .map((thread) => {
      const message = lastMessage(thread)
      if (!message || message.senderRole !== incomingRole) return null
      return { thread, messageId: message.id }
    })
    .filter(Boolean) as Array<{ thread: ExhibitorConversationThread; messageId: string }>
}

function lastMessage(thread: ExhibitorConversationThread) {
  return thread.messages.length ? thread.messages[thread.messages.length - 1] : undefined
}
