node_modules: package.json
	npm install

check: node_modules
	npm run format
	npm run lint
	npm run type-check

dev: node_modules
	npm run dev -- --open
