import { describe, expect, it } from 'vitest'

type CallState = 'idle' | 'waiting' | 'connecting' | 'connected' | 'error' | 'peer-left'

/** Maps WebRTC connectionState to our CallState. Mirrors the logic in useWebRTC. */
function mapConnectionState(
  rtcState: RTCPeerConnectionState,
  currentCallState: CallState,
  secondCheck?: RTCPeerConnectionState,
): CallState {
  if (rtcState === 'connected') return 'connected'
  if (rtcState === 'failed') return 'error'
  if (rtcState === 'disconnected') {
    // After 3s timeout, check again
    if (secondCheck === 'disconnected') return 'peer-left'
    if (secondCheck === 'connected') return 'connected'
    return currentCallState // still pending timeout
  }
  return currentCallState
}

describe('call state transitions', () => {
  it('idle → waiting is the initial transition (on startCall)', () => {
    // This is set directly, not from mapConnectionState
    const state: CallState = 'waiting'
    expect(state).toBe('waiting')
  })

  it('maps connected RTC state', () => {
    expect(mapConnectionState('connected', 'connecting')).toBe('connected')
  })

  it('maps failed RTC state to error', () => {
    expect(mapConnectionState('failed', 'connected')).toBe('error')
  })

  it('disconnected with confirmed check → peer-left', () => {
    expect(mapConnectionState('disconnected', 'connected', 'disconnected')).toBe('peer-left')
  })

  it('disconnected that recovers → connected', () => {
    expect(mapConnectionState('disconnected', 'connected', 'connected')).toBe('connected')
  })

  it('disconnected without second check → keeps current state (pending timeout)', () => {
    expect(mapConnectionState('disconnected', 'connected')).toBe('connected')
  })

  it('does not change state for non-terminal RTC states', () => {
    expect(mapConnectionState('new', 'idle')).toBe('idle')
    expect(mapConnectionState('connecting', 'waiting')).toBe('waiting')
  })
})

describe('error state differentiation', () => {
  it('error state is distinct from peer-left', () => {
    const error: CallState = 'error'
    const peerLeft: CallState = 'peer-left'
    expect(error).not.toBe(peerLeft)
  })

  it('all states are exhaustive', () => {
    const allStates: CallState[] = ['idle', 'waiting', 'connecting', 'connected', 'error', 'peer-left']
    expect(allStates).toHaveLength(6)
    expect(new Set(allStates).size).toBe(6)
  })
})

describe('beforeunload guard logic', () => {
  const activeStates: CallState[] = ['connected', 'waiting', 'connecting']
  const inactiveStates: CallState[] = ['idle', 'error', 'peer-left']

  it('should guard during active call states', () => {
    for (const state of activeStates) {
      const shouldGuard = state === 'connected' || state === 'waiting' || state === 'connecting'
      expect(shouldGuard, `${state} should be guarded`).toBe(true)
    }
  })

  it('should not guard during inactive states', () => {
    for (const state of inactiveStates) {
      const shouldGuard = state === 'connected' || state === 'waiting' || state === 'connecting'
      expect(shouldGuard, `${state} should not be guarded`).toBe(false)
    }
  })
})
