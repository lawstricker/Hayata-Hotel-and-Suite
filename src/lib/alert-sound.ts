let sharedContext: AudioContext | null = null

/**
 * Plays the kitchen alert.
 *
 * The sound is generated with the Web Audio API, so no audio file has to be
 * shipped or cached. Two rising tones make it recognisable over the noise of a
 * busy kitchen.
 */
export function playKitchenAlert(): boolean {
  try {
    const AudioContextClass = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return false
    if (!sharedContext) sharedContext = new AudioContextClass()
    const context = sharedContext
    // Browsers keep the context suspended until the page has been used.
    if (context.state === 'suspended') void context.resume()
    const now = context.currentTime
    for (const [index, frequency] of [880, 1174].entries()) {
      const start = now + index * 0.22
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.28, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.2)
    }
    return true
  } catch {
    return false
  }
}
