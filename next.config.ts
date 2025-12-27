import { withAssetLoaders, withSvgr } from "./lib/next-config-helpers"
import type { NextConfig } from "next"

const BASE_CONFIG: NextConfig = {
	reactCompiler: true,
}

export default [withSvgr, withAssetLoaders].reduce((acc, fn) => fn(acc), BASE_CONFIG)
