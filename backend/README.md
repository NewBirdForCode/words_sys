# words_sys FastAPI 后端

## 功能

- 用户注册、登录、退出、修改个人信息
- JWT Bearer 会话，服务端可撤销登录会话
- 角色：`student`、`teacher`、`admin`
- 教师创建学校班级、添加学生、查看班级成员
- 教师上传班级自定义词库，并把词库同步给班级全部学生
- 学生读取系统词库、所属班级词库，并提交自己的单词学习状态
- 管理员创建/更新系统词库和教师账号
- SQLite 开发数据库；生产环境可通过 `DATABASE_URL` 切换 PostgreSQL
- Uvicorn TLS 启动，支持 HTTPS

## 安装和启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
./scripts/generate_dev_cert.sh

# HTTPS: https://localhost:8443/docs
uvicorn app.main:app --host 0.0.0.0 --port 8443 \
  --ssl-keyfile certs/dev-key.pem \
  --ssl-certfile certs/dev-cert.pem
```

开发自签名证书会产生浏览器安全提示，仅用于本地开发。生产环境应使用受信任的 CA 证书（例如反向代理 Nginx/Caddy 自动签发的证书），不要把自签名证书用于公网生产。

## 主要接口

| 模块 | 接口 |
|---|---|
| 认证 | `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/logout` |
| 用户 | `GET/PATCH /api/users/me` |
| 管理员用户 | `POST /api/admin/users` |
| 班级 | `GET/POST /api/classrooms` |
| 班级成员 | `POST /api/classrooms/{id}/students`、`GET /api/classrooms/{id}/students` |
| 词库 | `GET/POST /api/wordbooks`、`GET/PATCH /api/wordbooks/{id}` |
| 同步 | `POST /api/wordbooks/{id}/sync` |
| 学习记录 | `POST/GET /api/learning/records` |
| 学习汇总 | `GET /api/learning/summary` |
| 创建班级 | `POST /api/classrooms`，每个班级自动生成唯一邀请码 |
| 学生加入班级 | `POST /api/classrooms/join`，学生提交邀请码 |
| 刷新邀请码 | `POST /api/classrooms/{classroom_id}/invite-code` |
| 错题本 | `GET/POST /api/mistakes`、`POST /api/mistakes/{word_id}/resolve`、`DELETE /api/mistakes/{word_id}` |
| 抗遗忘进度 | `GET /api/memory-progress`、`POST /api/memory-progress` |
| 每日计划 | `GET /api/plan/settings`、`PUT /api/plan/settings` |
| 健康检查 | `GET /healthz` |

登录后在请求中携带：

```http
Authorization: Bearer <access_token>
```

## 权限规则

- 公开注册只能创建学生账号。
- 教师和管理员账号由管理员通过 `/api/admin/users` 创建。
- 教师只能管理自己创建的班级和班级词库。
- 教师词库更新后递增 `source_version`；班级学生读取的是同一份最新词库内容。
- 系统词库只能由管理员创建或更新。
- 学习记录始终绑定当前登录学生，学生不能写入其他学生的学习状态。
- 错题本、抗遗忘进度和计划设置按当前学生隔离保存。
- 教师可通过班级词库关联把自定义词库同步给班级成员。
- 一个教师可以创建多个班级，每个班级有独立的邀请码；刷新邀请码后旧邀请码立即失效。
- 学生只能通过邀请码加入班级，且学校信息必须与班级一致。
- 管理员可发布系统词库；系统词库对所有学生可见，停用后不再出现在可用列表。

## 首个管理员

为了避免公开接口直接创建管理员，生产环境应通过一次性初始化脚本或受保护的运维流程创建管理员。当前项目提供的 API 约定为：先由部署人员在数据库中创建管理员，之后由管理员调用 `/api/admin/users` 创建教师账号。部署时可以使用数据库管理工具插入一个 `role=admin` 用户，并使用 `pwdlib[argon2]` 生成密码哈希。
