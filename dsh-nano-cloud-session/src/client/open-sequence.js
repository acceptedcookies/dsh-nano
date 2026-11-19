/** Retired. There is no client-side open sequence anymore: `openSession`
 *  performs exactly one `native_open` call and shows the localized
 *  unavailable notice when the host cannot map the session natively. Kept as
 *  a tombstone; do not reintroduce mounted/adopt polling or tab plumbing. */
export {}
