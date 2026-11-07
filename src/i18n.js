import { useSyncExternalStore } from "react";
const translations = Object.fromEntries(
  `
调整编辑栏宽度|Resize editor panel
内容编辑|Content
简历模板|Templates
排版设置|Layout
全部|All
工作|Professional
校招|Graduate
学术|Academic
经典留白|Classic white
编辑式 · 墨|Editorial ink
索引 · 极简|Minimal index
学术 · 宋|Academic serif
紧凑商务|Compact business
大标题、紧凑抬头与右上角照片|Larger headings, a compact header and a top-right portrait
居中衬线姓名，双线与黑白层次|Centered serif heading with subtle grayscale divisions
大字姓名，粗线与利落的信息层级|Large name with crisp information hierarchy
圆点与竖线串联每一段经历|Dots and lines connect your experience
浅色信息栏，联系方式与技能分层|A light sidebar for contact details and skills
深色侧栏与白色正文，克制而鲜明|A dark sidebar with a clean white body
左侧模块索引，右侧展开经历|Section labels on the left and experience on the right
宋体居中抬头，适合科研与教育岗位|Centered serif heading for academic and education roles
窄色带与紧凑分区，承载丰富经历|Compact sections for more detailed experience
✓ 正在使用|✓ In use
纸面编辑工具|Resume editing toolbar
纸面编辑 |Edit resume:\u0020
正文|Body
加粗|Bold
斜体|Italic
下划线|Underline
项目列表|Bullet list
编号列表|Numbered list
调整照片|Adjust photo
PDF 简历|PDF resume
已解析 · 原始文件保留|Parsed · Original file kept
已保存到我的简历，可继续对话修改。|Saved to My resumes. Continue chatting to refine it.
解析内容已保存，可以直接编辑。|Parsed content saved. You can edit it now.
API 已配置，联通正常|API configured and connected
API 已配置，打开设置可测试|API configured. Open settings to test.
点击设置配置 API|Open settings to configure the API
API 已配置。留空保留原密钥，点击“测试联通”可检查连接。|API configured. Leave the key blank to keep it, or test the connection.
通过 DeepSeek Harness 调用模型。填写 API Key 后，测试一次真实回答。|Enter your API key and test a real response through DeepSeek Harness.
新增模块|Add section
删除模块|Delete section
常规字重|Regular
上传图片，也可粘贴或拖入|Upload, paste or drop an image
返回编辑预览|Back to editable preview
原 PDF 对照|Compare original PDF
收起助手|Hide assistant
展开助手|Show assistant
已提取|Extracted
暂无内容|No content yet
更换头像|Change photo
上传照片|Upload photo
显示模块|Show section
收起|Collapse
展开|Expand
学校|School
公司 / 单位|Company / Organization
项目名称|Project name
标题（可选）|Title (optional)
专业 / 学历|Major / Degree
更换|Replace
我的档案|My profile
的简历|'s resume
正在连接简历Agent…|Connecting to Resume Agent…
正在按你的要求修改简历…|Updating your resume…
正在解析 PDF，提取经历与照片…|Extracting experience and photos from the PDF…
简历仅保存在当前浏览器，重要版本请导出 PDF 留存。|Resumes are stored in this browser. Export important versions as PDFs.
界面语言|Interface language
只切换界面文字，不修改简历内容。|Changes the interface language only, not your resume content.
预览中已隐藏|Hidden in preview
AI简历|AI Resume
简历Agent|Resume Agent
我的简历|My resumes
个人档案|Personal profile
Agent 设置|Agent settings
我的求职工作台|My workspace
自动保存在当前浏览器|Saved in this browser
无需登录 · 开源免费|No login · Free and open source
本地自动保存|Saved locally
复制一个版本，为不同岗位做一点微调。|Create a copy and tailor it to a different role.
导入 PDF / JSON|Import PDF / JSON
新建简历|New resume
搜索简历|Search resumes
搜索简历名称或目标岗位|Search by resume name or target role
简历排序|Sort resumes
最近编辑|Recently edited
名称排序|Name
从档案创建|Create from profile
拖入 PDF 或 JSON|Drop a PDF or JSON file
正在导入简历…|Importing resume…
请选择 PDF 或 JSON 文件。|Choose a PDF or JSON file.
请一次拖入一个文件。|Drop one file at a time.
还没有简历，可以新建或导入 PDF。|No resumes yet. Create one or import a PDF.
正在提取 PDF 原文，由 AI 整理到对应栏目…|Extracting PDF text and organizing sections with AI…
没有找到匹配的简历，换个关键词试试。|No matching resumes. Try another keyword.
内容仅保存在当前浏览器。清理浏览器数据前，请在编辑器中导出 JSON 备份。|Your resumes are stored in this browser. Export important versions before clearing browser data.
编辑简历|Edit resume
新的简历名称|New resume name
复制|Duplicate
改名|Rename
你的经历，是所有简历的起点。|Your experience starts every resume.
记录真实经历与成果，助手会在你允许时参考这里。修改档案不会覆盖已有简历。|Keep a factual record of your experience. The agent can reference it with your permission; existing resumes stay independent.
备份档案|Back up profile
档案目录|Profile sections
由你维护的真实档案|Facts maintained by you
从简历填入档案|Copy a resume into profile
从已有简历填入…|Copy from a resume…
导入备份|Import backup
个人信息|Personal information
求职信息|Job preferences
你期待的岗位、方向、城市与工作方式。|Your preferred roles, fields, cities and working arrangements.
档案求职信息|Profile job preferences
例如：AI 产品经理 / 北京；希望突出产品设计与 Agent 项目经历。|For example: AI product manager; emphasize product design and agent projects.
补充事实|Additional facts
写下暂时没有放进简历的背景、职责、成果与证据。数据不确定时请标注待核实。|Record responsibilities, results and supporting details not yet on your resume. Mark uncertain figures for verification.
档案补充事实|Additional profile facts
可以大致描述你真实做过的事，不需要先写成漂亮的简历。|Describe what you actually did. It does not have to read like a finished resume.
档案与写作偏好|Profile and writing preferences
让助手理解你的求职方向，保留每一段经历的真实性。|Help the agent understand your goals while keeping your experience factual.
参考个人档案|Reference personal profile
发送修改请求时，将档案中的经历一并提供给 DeepSeek。|Include your profile experience when sending an edit request to DeepSeek.
默认目标岗位|Default target role
例如：AI 产品经理|For example: AI product manager
表达偏好|Writing preferences
真实经历始终优先|Facts always come first
不补造数字、不虚构职责；档案只由你维护，助手的改写不会自动成为新事实。|No invented numbers or responsibilities. Only you maintain your profile; generated wording does not automatically become a fact.
管理个人档案|Manage profile
正在等待模型回复…|Waiting for the model…
模型提供商|Model provider
选择提供商|Choose provider
当前使用|Active
自定义兼容 API|Custom compatible API
输入当前提供商的 API Key|Enter this provider’s API key
API 地址（Chat Completions）|API base URL (Chat Completions)
为各提供商分别配置 API。保存后，简历助手和 PDF 导入使用当前模型。|Configure each provider separately. The saved model is used by the resume agent and PDF import.
发送修改请求时，将档案中的经历一并提供给当前模型。|Include your profile experience when sending edit requests to the active model.
模型与 API|Model and API
通过 DeepSeek Harness 连接模型，可在这里配置并测试真实回答。|Connect through DeepSeek Harness. Configure the API here and test a real response.
上传简历或直接聊聊你的经历，我来帮你整理。|Upload your resume or tell me about your experience. I will help you shape it.
移除上传的简历|Remove uploaded resume
给简历Agent发送要求|Message Resume Agent
上传 PDF，然后说：帮我改成适合 AI 产品经理岗位的简历，精简到两页…|Upload a PDF and describe the changes: tailor it for a product manager role, shorten it to two pages…
上传简历Agent PDF|Upload PDF to Resume Agent
上传 PDF 简历|Upload a PDF resume
上传 PDF 给简历Agent|Upload a PDF to Resume Agent
简历Agent参考来源|Resume Agent source
或选择一份简历|Or choose a resume
使用个人档案|Use personal profile
基础排版 · 自动命名|Basic layout · Automatic naming
开始新任务（已保存的简历保留）|Start a new task (saved resumes are kept)
开始新的简历任务|Start a new resume task
发送给简历Agent|Send to Resume Agent
查看 PDF 解析提示|View PDF import notes
进入编辑器|Open editor
将这段真实经历补充到个人档案？|Add these facts to your personal profile?
依据你的原话：|Based on your words:
保存到个人档案|Save to profile
暂不添加|Skip for now
Enter 发送 · Shift + Enter 换行|Enter to send · Shift + Enter for a new line
模型设置|Model settings
已补充到个人档案|Added to personal profile
简历助手|Resume assistant
Harness 设置|Harness settings
测试 API 联通|Test API connection
测试联通|Test connection
设置|Settings
最近测试|Last tested
密钥仅保存在服务端忽略提交的环境文件中，不会回显或存入浏览器。|Your key is stored only in the server's ignored environment file. It is never returned or stored in the browser.
模型|Model
模型 ID|Model ID
API 地址（Messages 协议）|API endpoint (Messages protocol)
API 地址|API endpoint
保存并测试回答|Save and test a response
模型回复：|Model response:
使用已有 Harness 配置|Use an existing Harness configuration
已在 Harness 配过 API 的用户可以不填写新密钥，直接测试；没有配置时无法回答。|If your API is already configured in Harness, test it without entering a new key.
打开 Harness 设置|Open Harness settings
你的 AI 求职助手|Your AI resume assistant
正在与 Harness 沟通…|Working with Harness…
待应用的修改|Changes to review
· 查看新内容|· View updated content
查看新增内容|View added content
全局排版：|Global layout:
应用修改|Apply changes
放弃|Discard
本次参考个人档案|Using your personal profile
AI生成|AI generate
AI润色|AI polish
AI诊断|AI review
清除选中内容|Clear selection
选择参考图片|Choose reference images
给简历助手发送消息|Message resume assistant
告诉我，你想怎样优化简历…|Tell me how you would like to improve your resume…
上传参考图片|Upload reference images
助手修改范围|Assistant edit scope
整份简历|Entire resume
基本信息|Basic information
发送|Send
发送消息|Send message
内容由 AI 生成，请核对后使用|AI-generated content. Please review before use.
API 联通正常|API connected
API 已配置，待测试|API configured, not yet tested
API 未配置|API not configured
API 已配置|API configured
Harness 已配置|Harness configured
未配置 API|API not configured
联通正常|Connected
测试失败|Test failed
待测试|Not tested
加载模型…|Loading model…
支持图片理解|Supports images
当前模型未确认支持图片|Image support not confirmed
已保存密钥；留空继续使用|Key saved; leave blank to keep it
输入你的 DeepSeek API Key|Enter your DeepSeek API key
添加链接|Add link
详细描述|Description
每一段经历，都值得被看见。|Make every experience count.
专注内容，轻松排版。|Focus on the content. Layout made easy.
必填|Required
向上移动模块|Move section up
向下移动模块|Move section down
模块格式|Section formatting
本模块行距|Section line spacing
恢复模板格式|Reset to template formatting
重命名模块|Rename section
该模块已隐藏，点击眼睛图标可重新显示。|This section is hidden. Click the eye icon to show it.
上移条目|Move entry up
删除条目|Delete entry
2023.06 — 至今|2023.06 — Present
添加|Add
删除此自定义模块|Delete custom section
清空此模块|Clear section
添加简历模块|Add resume section
新模块名称|New section name
例如：科研经历、志愿服务|For example: Research, Volunteering
确认添加模块|Add section
添加模块|Add section
内容自动保存在当前浏览器|Changes are saved in this browser
让排版，衬托你的经历。|Let your experience stand out.
下方为真实简历预览|Live resume previews below
浅青标题带|Teal Section Bands
浅青圆角底、青色竖条与深色粗体标题|Rounded pale teal bands with a teal accent and bold dark headings
已更新到简历|Updated in your resume
已完成分析|Analysis complete
重新生成|Regenerate
撤回本次修改|Undo this change
完成|Done
返回|Back
参考方向：|Inspiration:
布局独立实现，切换模板会应用配套字体和间距，内容保持不变。|Each template has its own fonts and spacing. Switching templates preserves your content.
刚刚好的阅读节奏。|Find the right reading rhythm.
细微调整，让每一页都恰到好处。|Fine-tune the spacing on every page.
正文字体|Body font
现代黑体|Modern sans serif
经典宋体|Classic serif
主题颜色|Accent color
自定义颜色|Custom color
页面尺寸固定为 A4。预览与 PDF 导出使用同一套排版。|A4 page size. Preview and PDF export use the same layout.
上传个人照片|Upload portrait
请选择|Select
男|Male
女|Female
不填写|Not specified
已隐藏|Hidden
照片尺寸与显示设置|Photo size and visibility
上传简历照片|Upload resume photo
添加照片|Add photo
简历照片|Resume photo
上传后可框选裁剪，照片随简历保存。|Crop the uploaded photo. It is saved with this resume.
重新裁剪|Crop again
显示照片|Show photo
删除照片|Delete photo
删除|Delete
选择简历照片|Choose resume photo
照片宽度|Photo width
简历照片宽度|Resume photo width
PDF 中提取的图片（|Images extracted from PDF (
裁剪简历照片|Crop resume photo
关闭照片裁剪|Close photo crop
拖动选框调整位置，拖动右下角调整大小。照片按选框裁剪，保留原始画面。|Drag to move the crop area. Resize it from the bottom-right corner. The original image is preserved.
照片裁剪选框|Photo crop area
调整裁剪框大小|Resize crop area
照片比例|Photo ratio
照片裁剪比例|Photo crop ratio
3:4 · 证件照|3:4 · Portrait
1:1 · 方形|1:1 · Square
4:5 · 人像|4:5 · Portrait
裁剪范围|Crop size
照片裁剪范围|Photo crop size
确认裁剪并使用|Use cropped photo
输入名称，回车添加|Type a name and press Enter
编辑|Edit
关闭预览编辑|Close preview editor
选中：|Selected:
直接修改此条目的完整内容，保存后会重新排版。|Edit the complete entry. The page reflows after saving.
交给助手修改|Edit with assistant
正在准备排版…|Preparing layout…
简历助手首页|AI Resume home
返回我的简历|Back to my resumes
简历名称|Resume name
修改简历名称|Rename resume
草稿|Draft
已自动保存|Saved automatically
保存中…|Saving…
撤销|Undo
重做|Redo
导出 PDF|Export PDF
实时预览|Live preview
共|Total
页|pages
导入的原始 PDF|Original imported PDF
你的下一段旅程，从这一页开始。|Your next chapter starts here.
缩小|Zoom out
放大|Zoom in
调整助手宽度|Resize assistant
从预览选择简历照片|Choose photo from preview
选中内容操作|Selection actions
直接编辑|Edit directly
带入对话|Use in chat
关闭选中操作|Close selection actions
简历助手 · 清晰表达每一段经历。|AI Resume · Make your experience clear.
开源免费|Free and open source
无需登录|No login required
为你的下一步而设计|Designed for your next step
内容已提取，确认后开始编辑。|Content extracted. Review and start editing.
。PDF 已转换为可编辑模块；内嵌图片列在下方，可选择照片并重新裁剪。|. PDF content is now editable. Choose an extracted photo below to crop it.
模块识别结果|Detected sections
姓名：|Name:
已选择照片|Photo selected
裁剪|Crop
不使用|Do not use
第|Page
请对照提取原文，核对是否有遗漏，以及条目标题、日期和内容归属。|Compare the extracted text with the sections and check for omissions, titles, dates, and placement.
AI 已整理栏目，请核对后导入。|AI organized the sections. Review before importing.
提取原文 · 可滚动检查|Extracted text · Scroll to review
取消|Cancel
确认导入，开始编辑|Import and start editing
姓名|Name
性别|Gender
生日|Date of birth
电话|Phone
手机号码|Phone number
微信|WeChat
邮箱|Email
电子邮箱|Email address
籍贯|Hometown
期望城市|Preferred city
求职意向|Target role
个人网站|Website
其他信息|Other information
个人优势|Summary
工作经历|Work experience
项目经历|Projects
教育经历|Education
专业技能|Skills
所获荣誉|Honors and awards
资格证书|Certifications
科研经历|Research
志愿服务|Volunteering
培训经历|Training
兴趣爱好|Interests
正文字号|Body font size
行间距|Line spacing
页面边距|Page margins
模块间距|Section spacing
倍|×
模块标题|Section heading
条目标题|Entry heading
职位 / 专业|Role / Major
职位 / 角色|Position / Role
起止时间|Dates
名称|Name
现代侧栏|Modern sidebar
深蓝履历|Navy executive
极简 · 留白|Minimal
经典 · 专业|Classic
紧凑 · 高效|Compact
学术 · 清晰|Academic
时间轴 · 青|Teal timeline
瑞士 · 清晰|Swiss
社论 · 典雅|Editorial
全部模板|All templates
单栏|Single column
双栏|Two columns
正在使用|In use
选择模板|Choose template
`
    .trim()
    .split("\n")
    .map((line) => {
      const index = line.indexOf("|");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
const listeners = new Set();
let language = "zh";
try {
  if (localStorage.getItem("ai-resume.language") === "en") language = "en";
} catch {}
if (typeof document !== "undefined")
  document.documentElement.lang = language === "en" ? "en" : "zh-CN";
export const getLanguage = () => language;
export function t(text) {
  if (language !== "en" || typeof text !== "string") return text;
  if (translations[text]) return translations[text];
  for (const [prefix, english] of [
    ["从预览隐藏", "Hide in preview: "],
    ["隐藏", "Hide "],
    ["填写", "Enter "],
    ["添加", "Add "],
    ["编辑简历 ", "Edit resume "],
    ["复制简历 ", "Duplicate resume "],
    ["删除简历 ", "Delete resume "],
    ["重命名简历 ", "Rename resume "],
  ])
    if (text.startsWith(prefix))
      return (
        english +
        (translations[text.slice(prefix.length)] || text.slice(prefix.length))
      );
  return text;
}
export function setLanguage(value) {
  language = value === "en" ? "en" : "zh";
  try {
    localStorage.setItem("ai-resume.language", language);
  } catch {}
  if (typeof document !== "undefined")
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
  listeners.forEach((fn) => fn());
}
export function useLanguage() {
  const value = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => language,
  );
  return [value, setLanguage];
}
