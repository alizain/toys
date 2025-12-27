import type { NextConfig } from "next"
import { withAssetLoaders, withSvgr } from "./lib/next-config-helpers"

const BASE_CONFIG: NextConfig = {
	reactCompiler: true,
}

export default [withSvgr, withAssetLoaders].reduce((acc, fn) => fn(acc), BASE_CONFIG)
