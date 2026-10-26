node_modules: package.json
	npm install

check: node_modules mcp-server/node_modules
	npm run format
	npm --prefix mcp-server run format
	npm run lint
	npm run type-check
	npm --prefix mcp-server run type-check

dev: node_modules
	npm run dev -- --open

install-hooks:
	git config core.hooksPath .githooks
	chmod +x .githooks/pre-commit

mcp-server/node_modules: mcp-server/package.json
	npm --prefix mcp-server install

mcp: mcp-server/node_modules
	npm --prefix mcp-server run build

mcp-auth: mcp-server/node_modules
	npm --prefix mcp-server run auth
