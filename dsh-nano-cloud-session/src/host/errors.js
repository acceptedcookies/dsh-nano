/** Workspace and native error types. Distinct from carrier NATIVE_* / HTTP mix. */

export class WorkspaceError extends Error {
  constructor(reason, message, { httpStatus, providerStatus = 0 } = {}) {
    super(String(message ?? reason).slice(0, 300))
    this.name = 'WorkspaceError'
    this.reason = reason
    this.httpStatus = httpStatus
    this.providerStatus = providerStatus
    this.status = httpStatus
  }
}

export class NativeError extends Error {
  constructor(code, message, status) {
    super(message)
    this.name = 'NativeError'
    this.reason = code
    this.nativeCode = code
    this.status = status
    this.httpStatus = status
    this.providerStatus = 0
  }
}

export function httpStatusForError(error) {
  if (error?.nativeCode != null) return error.status >= 400 ? error.status : 502
  if (error?.httpStatus >= 400) return error.httpStatus
  if (error?.status >= 400 && error.status < 500) return error.status
  return 502
}
