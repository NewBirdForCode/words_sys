import { WordItem } from '../types';

export interface PrintPaperOptions {
  paperType: 'single' | 'table'; // 单个拼写卷 (A4两列，每页20题) | 列表拼写卷 (表格形式，每页50题)
  direction: 'cn_to_en' | 'en_to_cn'; // 中文->默写英文 | 英文->默写中文
  withAnswerKey: boolean; // 是否附带答案页
  wordbookName: string;
}

export interface PrintPageData {
  pageNumber: number;
  totalPageCount: number;
  isAnswerKey: boolean;
  htmlContent: string;
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 格式化当前日期为中文展示
 */
function getFormattedToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 基础打印样式 (统一用于打印 iframe 及前端真实 A4 预览)
 */
export const PRINT_COMMON_STYLES = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  .print-page-body {
    background: #FFFFFF;
    color: #000000;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    width: 100%;
    height: 100%;
  }
  .serif {
    font-family: Georgia, Palatino, "Times New Roman", serif;
  }
  .exam-header {
    text-align: center;
    margin-bottom: 16px;
  }
  .exam-title {
    font-size: 20pt;
    font-weight: bold;
    color: #000000;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
  }
  .exam-subtitle {
    font-size: 11pt;
    color: #555555;
    margin-bottom: 12px;
  }
  .exam-info-bar {
    display: flex;
    justify-content: space-between;
    font-size: 10.5pt;
    color: #000000;
    padding-bottom: 8px;
  }
  .exam-info-col {
    flex: 1;
  }
  .exam-info-col.center {
    text-align: center;
  }
  .exam-info-col.right {
    text-align: right;
  }
  .exam-divider {
    height: 1.5pt;
    background: #333333;
    margin-bottom: 18px;
  }

  /* 单个拼写卷：A4两列排版，列距 3cm，每列 10 题，每页 20 题 */
  .single-paper-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 3cm;
    row-gap: 10px;
  }
  .single-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .single-question-item {
    display: flex;
    align-items: baseline;
    font-size: 11.5pt;
    line-height: 1.6;
    break-inside: avoid;
  }
  .single-question-num {
    font-weight: 600;
    margin-right: 6px;
    white-space: nowrap;
    min-width: 24px;
    color: #222222;
  }
  .single-question-prompt {
    white-space: nowrap;
    margin-right: 8px;
    max-width: 58%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .single-question-prompt.bold-serif {
    font-weight: bold;
    font-family: Georgia, Palatino, serif;
    font-size: 12pt;
  }
  .single-underline-fill {
    flex: 1;
    border-bottom: 0.8pt solid #000000;
    height: 1.2em;
    min-width: 50px;
  }

  /* 列表拼写卷：表格形式，双组并排，每页 50 题 (每列 25 题) */
  .table-paper-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 1.6cm;
  }
  .exam-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }
  .exam-table th {
    border-bottom: 1.5pt solid #333333;
    padding: 5px 4px;
    text-align: left;
    font-weight: bold;
    font-size: 9.5pt;
  }
  .exam-table td {
    border-bottom: 0.5pt solid #DDDDDD;
    padding: 5px 4px;
    vertical-align: middle;
    height: 28px;
  }
  .table-boxes-wrapper {
    display: flex;
    gap: 2.5px;
    align-items: center;
  }
  .table-box {
    width: 18px;
    height: 20px;
    border: 1pt solid #777777;
    border-radius: 2.5px;
    display: inline-block;
    background: #FFFFFF;
  }
  .table-line {
    display: block;
    width: 100%;
    border-bottom: 0.8pt solid #000000;
    height: 16px;
  }

  /* 答案页 */
  .answer-header {
    text-align: center;
    margin-bottom: 16px;
  }
  .answer-title {
    font-size: 18pt;
    font-weight: bold;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .answer-subtitle {
    font-size: 11pt;
    color: #555555;
    margin-bottom: 10px;
  }
  .answer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 2.2cm;
    row-gap: 10px;
    font-size: 10.5pt;
    line-height: 1.5;
  }
  .answer-item {
    display: flex;
    align-items: baseline;
    padding: 3px 0;
    border-bottom: 0.5pt dashed #E5E5E5;
  }
  .answer-idx {
    font-weight: bold;
    margin-right: 6px;
    color: #333333;
    min-width: 24px;
  }
  .answer-word {
    font-weight: bold;
    font-family: Georgia, Palatino, serif;
    margin-right: 8px;
    color: #000000;
  }
  .answer-divider-symbol {
    color: #888888;
    margin-right: 8px;
  }
  .answer-meaning {
    color: #222222;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

/**
 * 分页计算试卷每页 HTML 结构
 */
export function generatePrintPages(words: WordItem[], options: PrintPaperOptions): PrintPageData[] {
  const { paperType, direction, withAnswerKey, wordbookName } = options;
  const todayStr = getFormattedToday();
  const totalCount = words.length;

  if (totalCount === 0) return [];

  // 方向与排序
  let examWords = [...words];
  if (direction === 'en_to_cn') {
    // 英文卷打乱顺序防背题
    examWords = [...words].sort(() => Math.random() - 0.5);
  }

  const pages: PrintPageData[] = [];
  const pageSize = paperType === 'single' ? 20 : 50;
  const totalExamPages = Math.ceil(examWords.length / pageSize);
  const totalOverallPages = totalExamPages + (withAnswerKey ? 1 : 0);

  // 1. 生成题目各页
  for (let p = 0; p < totalExamPages; p++) {
    const pageNum = p + 1;
    const startIdx = p * pageSize;
    const endIdx = Math.min(startIdx + pageSize, examWords.length);
    const pageWords = examWords.slice(startIdx, endIdx);

    const headerHtml = `
      <div class="exam-header">
        <div class="exam-title">${escapeHtml(wordbookName)} · 拼写默写卷</div>
        <div class="exam-subtitle">${todayStr} ｜ 共 ${totalCount} 词 ｜ 建议限时 10 分钟 ${totalExamPages > 1 ? ` (第 ${pageNum}/${totalOverallPages} 页)` : ''}</div>
        <div class="exam-info-bar">
          <div class="exam-info-col">姓名：______________</div>
          <div class="exam-info-col center">日期：______年____月____日</div>
          <div class="exam-info-col right">得分：__________</div>
        </div>
        <div class="exam-divider"></div>
      </div>
    `;

    let questionsBodyHtml = '';

    if (paperType === 'single') {
      // 单个拼写卷：每页 20 题，分两列各 10 题
      const col1 = pageWords.slice(0, 10);
      const col2 = pageWords.slice(10, 20);

      const renderColumn = (list: WordItem[], offset: number) => {
        return list.map((item, idx) => {
          const globalIdx = startIdx + offset + idx + 1;
          const promptText =
            direction === 'cn_to_en'
              ? (item.meaning || item.translation || '暂无释义').trim()
              : (item.word || '').trim();
          const promptClass = direction === 'en_to_cn' ? 'bold-serif' : '';

          return `
            <div class="single-question-item">
              <span class="single-question-num">${globalIdx}.</span>
              <span class="single-question-prompt ${promptClass}" title="${escapeHtml(promptText)}">${escapeHtml(promptText)}</span>
              <span class="single-underline-fill"></span>
            </div>
          `;
        }).join('');
      };

      questionsBodyHtml = `
        <div class="single-paper-grid">
          <div class="single-column">${renderColumn(col1, 0)}</div>
          <div class="single-column">${renderColumn(col2, 10)}</div>
        </div>
      `;
    } else {
      // 列表拼写卷：每页 50 题，表格形式左右各 25 题
      const col1 = pageWords.slice(0, 25);
      const col2 = pageWords.slice(25, 50);

      const renderTable = (list: WordItem[], offset: number) => {
        const rows = list.map((item, idx) => {
          const globalIdx = startIdx + offset + idx + 1;
          const prompt =
            direction === 'cn_to_en'
              ? (item.meaning || item.translation || '').trim()
              : (item.word || '').trim();

          let inputCol = '';
          if (direction === 'cn_to_en') {
            // 6 个并排小方格
            const targetLen = (item.word || '').length;
            const boxCount = Math.min(Math.max(6, targetLen), 10);
            const boxes = Array.from({ length: boxCount })
              .map(() => '<span class="table-box"></span>')
              .join('');
            inputCol = `<div class="table-boxes-wrapper">${boxes}</div>`;
          } else {
            inputCol = '<span class="table-line"></span>';
          }

          return `
            <tr>
              <td style="width: 26px; color: #555555; text-align: center;">${globalIdx}.</td>
              <td style="font-weight: ${direction === 'en_to_cn' ? 'bold' : 'normal'};">
                ${escapeHtml(prompt)}
              </td>
              <td style="width: 130px; text-align: right;">
                ${inputCol}
              </td>
              <td style="width: 32px; border-left: 0.5pt solid #E5E5E5; text-align: center; color: #BBB;">
                ☐
              </td>
            </tr>
          `;
        }).join('');

        return `
          <table class="exam-table">
            <thead>
              <tr>
                <th style="width: 26px; text-align: center;">No.</th>
                <th>${direction === 'cn_to_en' ? '释义 / 题目' : '单词 Word'}</th>
                <th style="width: 130px; text-align: right;">拼写区</th>
                <th style="width: 32px; text-align: center;">得分</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        `;
      };

      questionsBodyHtml = `
        <div class="table-paper-grid">
          <div>${renderTable(col1, 0)}</div>
          <div>${renderTable(col2, 25)}</div>
        </div>
      `;
    }

    const pageHtml = `
      <div class="print-page-body">
        ${headerHtml}
        ${questionsBodyHtml}
      </div>
    `;

    pages.push({
      pageNumber: pageNum,
      totalPageCount: totalOverallPages,
      isAnswerKey: false,
      htmlContent: pageHtml,
    });
  }

  // 2. 生成答案页 (若勾选)
  if (withAnswerKey) {
    const answerPageNum = totalExamPages + 1;
    const answerItems = examWords.map((item, idx) => {
      const meaningStr = (item.meaning || item.translation || '').trim();
      return `
        <div class="answer-item">
          <span class="answer-idx">${idx + 1}.</span>
          <span class="answer-word">${escapeHtml(item.word)}</span>
          <span class="answer-divider-symbol">｜</span>
          <span class="answer-meaning">${escapeHtml(meaningStr)}</span>
        </div>
      `;
    }).join('');

    const answerPageHtml = `
      <div class="print-page-body">
        <div class="answer-header">
          <div class="answer-title">${escapeHtml(wordbookName)} · 拼写默写卷 · 参考答案</div>
          <div class="answer-subtitle">${todayStr} ｜ 共 ${totalCount} 词 ｜ 仅供批改核对参考 (第 ${answerPageNum}/${totalOverallPages} 页)</div>
          <div class="exam-divider"></div>
        </div>
        <div class="answer-grid">
          ${answerItems}
        </div>
      </div>
    `;

    pages.push({
      pageNumber: answerPageNum,
      totalPageCount: totalOverallPages,
      isAnswerKey: true,
      htmlContent: answerPageHtml,
    });
  }

  return pages;
}

/**
 * 生成试卷完整打印 HTML（含 @page 规则，分页断页）
 */
export function generatePrintExamHtml(words: WordItem[], options: PrintPaperOptions): string {
  const pages = generatePrintPages(words, options);

  const pagesHtml = pages.map((page, idx) => `
    <div class="print-page-wrapper ${idx > 0 ? 'page-break' : ''}">
      ${page.htmlContent}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(options.wordbookName)} - 拼写默写卷</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 1.8cm 1.6cm;
        }
        body {
          margin: 0;
          padding: 0;
          background: #FFFFFF;
        }
        .print-page-wrapper {
          width: 100%;
        }
        .page-break {
          page-break-before: always;
          break-before: page;
        }
        ${PRINT_COMMON_STYLES}
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;
}

/**
 * 在隐藏 iframe 中渲染试卷并在渲染后自动触发 window.print()
 */
export function printExamPaperDirectly(words: WordItem[], options: PrintPaperOptions): void {
  if (typeof window === 'undefined') return;

  const htmlContent = generatePrintExamHtml(words, options);

  // 清除之前可能残留的打印 iframe
  const existingFrame = document.getElementById('ais-hidden-print-iframe');
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'ais-hidden-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // 降级兜底方案：新窗口打印
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(htmlContent);
      win.document.close();
      win.onload = () => {
        win.focus();
        win.print();
      };
    }
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // 保证全部 DOM 与字体布局就绪后再触发打印
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('iframe print fallback', e);
      iframe.contentWindow?.print();
    }

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60000);
  }, 350);
}
