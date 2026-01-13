.PHONY: install dev build run clean stop

# 安装依赖
install:
	npm install

# 开发模式
dev:
	npm run dev

# 构建
build:
	npm run build

# 预览构建结果
preview:
	npm run preview

# 运行（安装+预览）
run: install preview

# 停止服务
stop:
	@echo "停止开发服务器..."
	@taskkill /F /IM node.exe 2>nul || echo "没有正在运行的 Node 服务"
	@echo "服务已停止"

# 清理
clean:
	rm -rf node_modules dist
