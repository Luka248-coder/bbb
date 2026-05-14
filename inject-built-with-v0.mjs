import fs from 'node:fs'

const layoutCandidates = [
  'app/layout.tsx',
  'app/layout.jsx', 
  'app/layout.js',
  'src/app/layout.tsx',
  'src/app/layout.jsx',
  'src/app/layout.js',
]

const layoutPath = layoutCandidates.find((candidate) => fs.existsSync(candidate))
if (!layoutPath) process.exit(0)

// Remove any injected v0 badge
const content = fs.readFileSync(layoutPath, 'utf8')
const cleaned = content.replace(/\n?\s*\{\/\* v0 - built-with badge \*\/\}[\s\S]*?<div dangerouslySetInnerHTML=\{\{ __html: `[\s\S]*?` \}\} \/>/g, '')
if (cleaned !== content) {
  fs.writeFileSync(layoutPath, cleaned)
}