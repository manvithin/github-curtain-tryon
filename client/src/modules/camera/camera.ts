export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'insecure-context'

export type CameraAccessResult = {
  status: CameraStatus
  message: string
  hint?: string
}

/**
 * Requests camera access through a native getUserMedia call.
 *
 * The returned MediaStream must be stopped by the caller when done.
 * Everything is on-device; no network involved.
 */
export async function requestCamera(): Promise<{
  result: CameraAccessResult
  stream: MediaStream | null
}> {
  if (!isSecureContext && window.location.hostname !== 'localhost') {
    return {
      result: {
        status: 'insecure-context',
        message: 'Camera requires HTTPS.',
        hint: 'Open this site over https:// (or localhost) and try again.',
      },
      stream: null,
    }
  }

  if (!('mediaDevices' in navigator) || !navigator.mediaDevices?.getUserMedia) {
    return {
      result: {
        status: 'unsupported',
        message: 'Your browser does not support camera access.',
        hint: 'Use the latest Chrome or Safari on a mobile device.',
      },
      stream: null,
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })
    return {
      result: {
        status: 'granted',
        message: 'Camera ready.',
      },
      stream,
    }
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return {
        result: {
          status: 'denied',
          message: 'Camera permission was blocked.',
          hint: 'Tap the lock/camera icon in your browser address bar, allow camera, then reload.',
        },
        stream: null,
      }
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return {
        result: {
          status: 'unsupported',
          message: 'No camera was found on this device.',
          hint: 'Check that a camera exists and is not used by another app.',
        },
        stream: null,
      }
    }
    return {
      result: {
        status: 'unsupported',
        message: 'Could not start the camera.',
        hint: err instanceof Error ? err.message : 'Try reloading the page.',
      },
      stream: null,
    }
  }
}
