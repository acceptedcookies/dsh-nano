/**
 * dsh-interface/host — host 门面出口（只注入 ctx）。
 * 不写文件、不持跨实例全局态；把合同投影到 ctx seam。
 */
export { createWebRegistrar, BindingError } from './createWebRegistrar.js'
export { createJsonClient, JsonClientError } from './createJsonClient.js'
