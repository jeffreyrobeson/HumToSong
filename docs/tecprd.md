# 🔧 LLL 技术实施方案

---

## 📊 技术栈确定

### 前端
- **Web App (推荐)**：React + Vite
  - 理由：快速开发，跨平台，易演示
  - 备选：iOS原生 (如团队熟悉Swift)

### 后端
- **Flask API** 部署在 Render/Vercel
  - 3个核心端点：识别物体、生成描述、匹配音乐

### 数据库
- **Firebase Realtime Database** (已验证✅)
  - 房间管理、Layer同步

### AI服务
- **Google Gemini 2.0 Flash API** (已验证✅)
  - Vision: 物体识别
  - Text: 音乐描述生成

### 音频存储
- **Firebase Storage** 或 Cloudflare R2
  - 30-50首音乐文件 (~150MB)

---

## 🎯 核心模块实现路径

### Module 1: 物体识别
**输入**: 照片 (Base64)  
**处理**: Gemini Vision API  
**输出**: JSON (物体名称、材质、颜色、音乐特质)  
**状态**: ✅ 已验证可行

### Module 2: 情绪分析
**输入**: Tap时间戳数组  
**处理**: 本地JavaScript算法  
**输出**: 情绪、BPM、能量、规律性  
**状态**: ✅ 算法已设计

### Module 3: 音乐描述生成
**输入**: 物体列表 + 情绪数据  
**处理**: Gemini Text API  
**输出**: 专业音乐描述 (genre, tempo, mood, instruments, tags)  
**状态**: ✅ 已验证效果优秀

### Module 4: 智能匹配
**输入**: Gemini描述 + 情绪 + 物体  
**处理**: Python匹配算法  
**核心逻辑**:
```
得分 = Tempo匹配(30%) 
     + Mood匹配(25%) 
     + 材质亲和度(20%) 
     + 标签相似度(15%) 
     + 能量匹配(10%)
```
**输出**: 音乐文件URL + 置信度 + 匹配理由

### Module 5: 实时协作
**技术**: Firebase Realtime Database  
**数据流**:
```
用户A添加Layer → Firebase → 推送给用户B/C
用户B添加Layer → Firebase → 推送给用户A/C
```
**状态**: ✅ 已验证可行

---

## 📂 音乐库策略

### 当前资源
- ✅ Lo-fi Piano: 10-15首

### 扩充计划 (优先级排序)
1. **Electronic/Synth**: 5首 (覆盖科技场景)
2. **Acoustic/Folk**: 5首 (覆盖自然场景)
3. **Upbeat/Energy**: 5首 (覆盖高能场景)

**来源**: Pixabay Music, FreePD, Incompetech (免费无版权)

### 元数据结构
每首音乐需要:
```
- 文件名
- Tempo范围 [min, max]
- Mood (calm/focused/upbeat/excited/melancholic)
- 材质亲和度 (wood/metal/ceramic/organic)
- 能量level (0-1)
- 标签数组 (用于语义匹配)
```

### 生成方式
**方案A** (推荐): 用 librosa 库自动分析
- 提取Tempo (BPM)
- 分析能量 (RMS)
- 判断调性 (Major/Minor)

**方案B**: 手动标注
- 听音乐，填写元数据JSON

---

## 🔄 数据流设计

### Solo模式完整流程
```
1. 用户拍照
   ↓
2. 前端转Base64 → 后端API
   ↓
3. 后端调用Gemini Vision
   ↓ (1-2秒)
4. 返回物体JSON → 前端显示
   ↓
5. 用户点击演奏 → 记录Tap时间戳
   ↓
6. 前端计算情绪 (本地JS)
   ↓
7. 发送到后端: {物体, 情绪}
   ↓
8. 后端:
   a) Gemini生成音乐描述
   b) 匹配算法选音乐
   ↓ (2-3秒)
9. 返回: {音频URL, 置信度, 理由}
   ↓
10. 前端播放音乐
```

### 协作模式数据流
```
用户A:
1. 完成Solo流程1-6
   ↓
2. 创建房间 → Firebase写入
   ↓
3. 生成房间码 → 分享

用户B:
1. 输入房间码 → Firebase读取
   ↓
2. 监听房间Layers
   ↓
3. 完成自己的Solo流程1-6
   ↓
4. 添加Layer → Firebase写入
   ↓
5. 推送给所有人

所有用户:
1. 看到所有Layers
   ↓
2. 点击"生成"
   ↓
3. 后端:
   - 合并所有Layers特征
   - 计算综合描述
   - 匹配音乐
   ↓
4. 返回音乐 → 所有人同时播放
```

---

## 🏗️ 部署架构

### 后端API
**平台**: Render (免费tier)  
**语言**: Python Flask  
**环境变量**:
```
GEMINI_API_KEY=xxx
FIREBASE_CONFIG=xxx
MUSIC_CDN_URL=xxx
```

### 音乐文件
**存储**: Firebase Storage  
**结构**:
```
/music
  /lofi
    - calm_morning_coffee.mp3
    - focused_workspace.mp3
  /electronic
    - cyber_workspace.mp3
  /acoustic
    - nature_walk.mp3
  /upbeat
    - happy_day.mp3
```

### 前端
**平台**: Vercel (免费tier)  
**构建**: React + Vite  
**环境变量**:
```
VITE_API_URL=https://your-backend.onrender.com
VITE_FIREBASE_CONFIG=xxx
```

---

## ⏱️ 开发时间线 (14天)

### Week 1: 核心功能
**Day 1-2**: 
- 搭建Flask后端
- 集成Gemini API
- 测试物体识别

**Day 3-4**:
- 实现音乐描述生成
- 音乐库整理 (用librosa分析)
- 生成元数据JSON

**Day 5-6**:
- 实现匹配算法
- 测试匹配准确率
- 优化权重参数

**Day 7**:
- React前端框架搭建
- 相机界面
- 物体识别集成

### Week 2: 协作+优化
**Day 8-9**:
- 演奏界面 + 情绪分析
- 音乐播放器

**Day 10-11**:
- Firebase协作系统
- 房间管理
- 实时同步测试

**Day 12-13**:
- 卡牌系统
- 分享功能
- UI/UX优化

**Day 14**:
- Bug修复
- 演示准备
- 性能优化

---

## 🎬 比赛演示准备

### 硬件需求
- 3-4部手机 (演示者 + 评委)
- 投屏设备 (显示界面)
- 外接音箱 (播放音乐)
- 稳定WiFi

### 软件准备
- 预先生成5个高质量匹配结果
- 准备备用演示视频
- 测试房间码生成
- 验证Firebase连接

### 演示道具
- 咖啡杯、手机、笔记本、眼镜、笔
- (评委面前也准备一套小物体)

---

## 🚨 风险管理

### 技术风险

| 风险 | 概率 | 应对方案 |
|------|------|----------|
| Gemini API超限 | 低 | 准备备用识别结果JSON |
| Firebase连接失败 | 低 | 准备演示视频 |
| 音乐匹配不准 | 中 | 手动调整元数据提升准确率 |
| 网络延迟 | 中 | 使用本地热点 |

### 演示风险

| 风险 | 应对 |
|------|------|
| 评委不参与协作 | 演示者用多台设备自己演示 |
| 现场音乐效果差 | 准备高质量音箱 |
| 识别失败 | 重拍或使用预录结果 |

---
