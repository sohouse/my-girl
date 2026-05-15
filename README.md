# My Girl - 虚拟陪伴角色聊天应用

一个全栈虚拟女友项目，提供AI驱动的个性化角色互动体验。

## 功能特点

### 用户功能

- **角色选择** - 四个预设人格的女友角色可供选择
- **自定义角色** - 通过语言描述自定义女友及其头像
- **AI对话** - 基于角色人设的好感度系统，AI给出不同情感强度的回复
- **语音合成** - 文字回答通过AI转为自然语音，语气符合人设及上下文
- **图片生成** - 角色可根据上下文理解发送图片，自拍基于预设照片二次生成
- **记忆功能** - 角色记住对话中的重要内容
- **对话历史** - 存储聊天记录，可按时间查看并继续对话
- **邮件通知** - 重要节日或定时向用户邮箱发送消息
- **分享功能** - 分享与角色的对话，生成精美的分享卡片

### 预设角色

| 角色 | 类型 | 简介 |
|------|------|------|
| 苏糯 | 软萌治愈系 | 21岁中文系学生，温柔软糯的小甜妹 |
| 沈清辞 | 清冷疏离系 | 23岁独立插画师，外冷内热的清冷型女友 |
| 夏栀 | 元气阳光系 | 20岁舞蹈系学生，活泼开朗的小太阳 |
| 温知予 | 温柔知性系 | 24岁图书管理员，成熟通透的灵魂伴侣 |

### 后台管理

- 用户管理 - 查看所有注册用户信息
- 角色管理 - 维护预设角色的人设、背景、语气等信息
- API配置 - 管理AI API接口和密钥
- 邮件配置 - 自定义邮件发送功能

## 技术栈

### 前端

- React + TypeScript
- Next.js App Router
- Tailwind CSS
- shadcn-ui
- Radix UI

### 后端

- Node.js
- Next.js API Route + Hono
- Better Auth (认证)

### 数据库与存储

- Neon Serverless Postgres
- Drizzle ORM
- CloudFlare R2 (文件存储)

### AI 服务

- **文字对话**: MiniMax M2.7
- **语音合成**: 豆包 volc.service_type.10050
- **图片生成**: ark doubao-seedream-5-0-260128

### 其他

- Zod (数据校验)
- Resend (邮件发送)
- CloudFlare Turnstile (人机验证)

## 项目结构

```
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── admin/             # 后台管理页面
│   ├── chat/             # 聊天页面
│   ├── sign-in/          # 登录页面
│   └── sign-up/          # 注册页面
├── components/            # React 组件
│   ├── auth/             # 认证相关组件
│   ├── characters/       # 角色相关组件
│   └── ui/               # UI 组件 (shadcn-ui)
├── server/                # 服务端逻辑
│   ├── ai/               # AI 服务集成
│   ├── auth/              # 认证逻辑
│   ├── chat/             # 聊天服务
│   ├── characters/       # 角色服务
│   ├── db/               # 数据库相关
│   ├── memory/           # 记忆服务
│   ├── security/         # 安全相关
│   └── storage/          # 存储服务
├── docs/                  # 项目文档
├── drizzle/               # Drizzle 数据库迁移
└── lib/                   # 工具库
```

## 快速开始

### 环境要求

- Node.js 18+
- npm / yarn / pnpm

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env.local` 并配置：

```bash
cp .env.example .env.local
```

### 数据库迁移

```bash
npm run db:generate
npm run db:migrate
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
npm run start
```

## 脚本命令

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint |
| `npm run test` | 运行测试 |
| `npm run db:generate` | 生成 Drizzle 迁移 |
| `npm run db:migrate` | 执行数据库迁移 |

## 部署

本项目支持部署到 Vercel。详细部署配置见 `vercel.json`。

## 许可证

私有项目
