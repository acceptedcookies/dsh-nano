/**
 * esbuild define for the DNPR build stamp (T-O-PRE1116-07.4).
 * Every plugin build that bundles any DNPR entry spreads this into `define`,
 * so the bundle carries the content hash of the DNPR source it contains.
 */
import { dnprBuildStamp } from './dnpr-build-stamp.mjs'

export const dnprDefine = Object.freeze({ __DNPR_BUILD__: JSON.stringify(dnprBuildStamp()) })
