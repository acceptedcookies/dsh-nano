/** Layout for this client's own elements. Controls are host primitives or
 * nano-ui; colours, type, radii and hairlines are host tokens; spacing and
 * layers come from nano-ui's scale. */
export const STYLE = `
.dnls-pane{height:100%;min-height:0}
.dnls-view{box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font:var(--dsw-font-xs-13)}
.dnls-view>.nano-toolbar{flex:none;gap:var(--nano-space-2)}
.dnls-heading{display:flex;flex:1 1 auto;align-items:baseline;gap:var(--nano-space-2);min-width:0;overflow:hidden;white-space:nowrap;font:var(--dsw-font-xs-strong-13)}
.dnls-heading>span:first-child{overflow:hidden;text-overflow:ellipsis}
.dnls-count{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13)}
.dnls-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:var(--nano-space-4);padding:var(--nano-space-3)}
.dnls-foot{flex:none;display:flex;align-items:center;justify-content:space-between;gap:var(--nano-space-2);min-height:28px;padding:0 var(--nano-space-3);border-top:var(--dsh-hairline-width) solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.dnls-group{display:flex;flex-direction:column;min-width:0;padding:0 var(--nano-space-3);background:var(--dsw-alias-bg-layer-2);border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg)}
.dnls-group>.nano-split{flex-wrap:wrap;min-height:40px;padding-block:var(--nano-space-1)}
.dnls-group>.nano-split:last-child{border-bottom:0}
.dnls-rows{padding:0;overflow:hidden}
.dnls-row{display:flex;align-items:center;gap:var(--nano-space-2);min-height:52px;padding:var(--nano-space-2) var(--nano-space-3);cursor:pointer}
.dnls-row+.dnls-row{border-top:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3)}
.dnls-row:hover{background:var(--dsw-alias-bg-layer-3)}
.dnls-row:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dnls-row>.dnls-row-copy{flex:1 1 auto}
.dnls-row-copy{display:flex;flex-direction:column;min-width:0;padding:var(--nano-space-1) 0}
.dnls-row-name{display:flex;align-items:baseline;gap:var(--nano-space-2);min-width:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-strong-13)}
.dnls-row-state{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnls-row-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dnls-row-tail{display:flex;flex:none;align-items:center;gap:var(--nano-space-1)}
.dnls-section{display:flex;flex-direction:column;gap:var(--nano-space-2);min-width:0}
.dnls-section-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--nano-space-2);min-height:28px}
.dnls-section-title{margin:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-strong-13)}
.dnls-muted{margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnls-error{margin:0;color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xxs-12)}
.dnls-inline{display:flex;flex-wrap:wrap;align-items:center;gap:var(--nano-space-2);min-width:0}
.dnls-status{display:flex;align-items:center;gap:var(--nano-space-2);margin-bottom:var(--nano-space-3)}
.dnls-status-label{font:var(--dsw-font-xs-strong-13)}
.dnls-status-size{margin-left:auto;color:var(--dsw-alias-label-secondary)}
.dnls-cta{display:flex;flex-direction:column;gap:var(--nano-space-2)}
.dnls-cta>*{width:100%}
.dnls-detail.nano-panes{height:auto}
.dnls-detail>.nano-pane{display:flex;flex-direction:column;gap:var(--nano-space-4);overflow:visible;padding-top:var(--nano-space-2)}
.dnls-detail>.nano-pane[hidden]{display:none}
.dnls-chart{display:flex;flex-direction:column;gap:var(--nano-space-1)}
.dnls-chart-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:var(--nano-space-2);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dnls-history{display:block;width:100%;height:48px;color:var(--dsw-alias-state-business-primary)}
.dnls-term{display:flex;align-items:center;gap:var(--nano-space-2);min-width:0}
.dnls-mono{font-family:var(--dsh-font-family-code);font-size:var(--dsh-code-font-size)}
.dnls-field{display:flex;flex-direction:column;gap:var(--nano-space-1);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dnls-grow{display:grid;grid-template-columns:minmax(0,1fr);flex:1 1 12rem;min-width:0}
.dnls-num{display:grid;grid-template-columns:minmax(0,1fr);width:6.5rem}
.dnls-label{display:flex;flex-direction:column;gap:2px;min-width:0}
.dnls-log{max-height:360px;overflow:auto;border-radius:var(--dsw-radius-md)}
`
