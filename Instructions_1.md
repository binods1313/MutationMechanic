🚀 URGENT: Fix MutationMechanic Vercel SVG build error

ERROR: esbuild fails on SVG xmlns="http://www.w3.org/2000/svg" in JSX

FIX 1: vite.config.ts - Add SVGR plugin
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
plugins: [react(), svgr()],
build: { outDir: 'dist' }
})

text

FIX 2: package.json - Install SVGR
npm i -D vite-plugin-svgr
npm run build # Test locally

text

FIX 3: JSX SVGs → Use React components
// ❌ BAD (causes build error)
<svg xmlns="http://www.w3.org/2000/svg">...</svg>

// ✅ GOOD
import { ReactComponent as Icon } from './icon.svg'
<Icon />

text

ALTERNATIVE: Move SVGs to /public/assets/
public/assets/icon.svg → <img src="/assets/icon.svg" />

text

TEST:
1. npm run build → No SVG errors
2. git push → Vercel success
3. mutationmechanic-xxx.vercel.app loads

DEADLINE: 10 min 🚀