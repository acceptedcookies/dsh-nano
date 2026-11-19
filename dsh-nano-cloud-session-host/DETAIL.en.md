# Cloud session native host

A host overlay companion for [dsh-nano-cloud-session]. The current official [dsh] release has no native view for external sessions. This package swaps the stock session, terminal, workspace-file, conversation and right-sidebar rows for modules built from the same upstream release plus one patch, so cloud sessions open in the native chat and workbench.

## What it does

- The host declares `sessionController.externalSessions` (view version 1), which the cloud session plugin uses to map a session to a native external session.
- External session messages render as native user and assistant messages; the files, attachments and terminal tabs are filtered by the session's capabilities.
- Files and terminals open only for sessions listed in the grants file, which only the operator can write on the host machine.

## Uninstall

Remove this package from the installed plugins and restart the host. The eight stock rows come back and the cloud session plugin reports that the native view is unavailable.
