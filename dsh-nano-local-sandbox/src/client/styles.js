/** Layout for this client's own elements. Controls are host primitives or
 *  nano-ui; colours, type, radii and hairlines are host tokens; spacing and
 *  layers come from nano-ui's scale. Plates mix a little of the label colour
 *  into the layer so they read as surfaces in both themes (the light layers
 *  are all white). */
export const STYLE = `
.dnls-pane{height:100%;min-height:0}
.dnls-view{box-sizing:border-box;display:flex;flex-direction:column;flex:1 1 auto;min-height:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13)}
.dnls-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:var(--nano-space-4);padding:var(--nano-space-3)}
.dnls-section{display:flex;flex-direction:column;gap:var(--nano-space-2);min-width:0}
.dnls-section-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--nano-space-2);min-height:28px;padding:0 var(--nano-space-1)}
.dnls-section-title{margin:0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-strong-13)}
.dnls-plate{display:flex;flex-direction:column;gap:var(--nano-space-3);min-width:0;padding:var(--nano-space-3);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,var(--dsw-alias-bg-layer-1));border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg)}
.dnls-group{display:flex;flex-direction:column;min-width:0;padding:0 var(--nano-space-3);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,var(--dsw-alias-bg-layer-1));border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg)}
.dnls-plate>.dnls-group{padding:0;background:transparent;border:0;border-radius:0}
.dnls-group>.nano-split{flex-wrap:wrap;min-height:40px;padding-block:var(--nano-space-1)}
.dnls-group>.nano-split:last-child{border-bottom:0}
.dnls-head-card{display:flex;flex-direction:column;gap:var(--nano-space-3);padding:var(--nano-space-3);background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,var(--dsw-alias-bg-layer-2));border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg)}
.dnls-object-head{flex:none;display:flex;flex-direction:column;gap:var(--nano-space-3);padding:var(--nano-space-3) var(--nano-space-3) 0}
.dnls-head-name{display:flex;align-items:center;gap:var(--nano-space-2);min-width:0}
.dnls-head-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-strong-13)}
.dnls-head-meta{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dnls-head-foot{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.dnls-meters{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr));gap:var(--nano-space-3)}
.dnls-cards{display:flex;flex-direction:column;gap:var(--nano-space-2)}
.dnls-card{display:flex;flex-direction:column;gap:var(--nano-space-3);min-width:0;padding:var(--nano-space-3);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,var(--dsw-alias-bg-layer-1));border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);cursor:pointer}
.dnls-card:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,var(--dsw-alias-bg-layer-2))}
.dnls-card:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dnls-card-head{display:flex;flex-wrap:wrap;align-items:center;gap:var(--nano-space-2);min-width:0}
.dnls-card-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-strong-13)}
.dnls-card-state{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnls-card-tail{display:flex;flex:none;align-items:center;gap:var(--nano-space-1);margin-left:auto}
.dnls-apps{display:flex;flex-wrap:wrap;align-items:center;gap:var(--nano-space-2)}
.dnls-dock-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--nano-space-2);min-height:28px}
.dnls-muted{margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnls-error{margin:0;color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xxs-12)}
.dnls-inline{display:flex;flex-wrap:wrap;align-items:center;gap:var(--nano-space-2);min-width:0}
.dnls-chart{display:flex;flex-direction:column;gap:var(--nano-space-1)}
.dnls-chart-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:var(--nano-space-2);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dnls-history{display:block;width:100%;height:48px;color:var(--dsw-alias-state-business-primary)}
.dnls-row-copy{display:flex;flex-direction:column;min-width:0}
.dnls-row-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnls-term{display:flex;align-items:center;gap:var(--nano-space-2);min-width:0}
.dnls-mono{font-family:var(--dsh-font-family-code);font-size:var(--dsh-code-font-size)}
.dnls-field{display:flex;flex-direction:column;gap:var(--nano-space-1);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dnls-grow{display:grid;grid-template-columns:minmax(0,1fr);flex:1 1 12rem;min-width:0}
.dnls-num{display:grid;grid-template-columns:minmax(0,1fr);width:6.5rem}
.dnls-label{display:flex;flex-direction:column;gap:2px;min-width:0}
.dnls-log{height:360px;overflow:auto;border-radius:var(--dsw-radius-md)}
.dnls-pending{display:flex;align-items:center;justify-content:center;margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnls-pending-usage,.dnls-usage{min-height:180px}
.dnls-pending-page{min-height:240px}
.dnls-pending-block{min-height:120px}
.dnls-pending-log{height:360px}
.dnls-pending-row{min-height:40px}
.dnls-pending-procs,.dnls-procs{height:232px}
.dnls-procs{min-width:0;overflow-y:auto;overscroll-behavior:contain}
.dnls-procs .nano-table{width:100%}
.dnls-procs thead th{position:sticky;top:0;z-index:var(--nano-layer-local1);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,var(--dsw-alias-bg-layer-1))}
.dnls-procs .dnls-num-cell{text-align:right;font-family:var(--dsh-font-family-code)}
.dnls-procs td{height:28px;padding-block:var(--nano-space-1);border-bottom:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3)}
.dnls-procs tbody tr:last-child td{border-bottom:0}
.dnls-procs tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dnls-procs td.dnls-col-name{width:100%;color:var(--dsw-alias-label-primary)}
.dnls-procs td.dnls-col-state{color:var(--dsw-alias-label-tertiary)}
.dnls-procs th{cursor:pointer;user-select:none}
.dnls-procs th:hover{color:var(--dsw-alias-label-primary)}
.dnls-procs th:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dnls-procs .dnls-col-label{display:inline-flex;align-items:center;gap:2px}
.dnls-procs .dnls-sort-icon{display:inline-flex;opacity:0}
.dnls-procs th:hover .dnls-sort-icon,.dnls-procs th[aria-sort="ascending"] .dnls-sort-icon,.dnls-procs th[aria-sort="descending"] .dnls-sort-icon{opacity:1}
.dnls-card .nano-facts dd,.dnls-head-card .nano-facts dd{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dnls-page-head{display:flex;align-items:center;justify-content:space-between;gap:var(--nano-space-3);padding:0 var(--nano-space-1)}
.dnls-page-copy{display:flex;flex-direction:column;gap:2px;min-width:0}
.dnls-page-title{margin:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-m-18);font-weight:600}
.dnls-page-desc{margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnls-tabbar{flex:none;padding:var(--nano-space-2) var(--nano-space-3) 0}
.dnls-panel{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:var(--nano-space-4);padding:var(--nano-space-2) var(--nano-space-3) var(--nano-space-3)}
`
