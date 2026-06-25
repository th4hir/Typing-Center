/**
 * exportHelper.js
 * Utility helper to handle PDF and Excel exports.
 */

// Helper to format date in local format
const formatDate = (dateVal) => {
  if (!dateVal) return '—'
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Exports data to a Microsoft Excel compatible HTML/XML spreadsheet (.xls)
 * @param {string[]} headers List of column header names
 * @param {Array<Array<any>>} rows Array of rows, where each row is an array of cell values
 * @param {string} defaultName Default name of the file to save
 */
export const exportToExcel = async (headers, rows, defaultName) => {
  try {
    let tableHtml = '<table border="1" style="border-collapse:collapse; font-family:\'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; font-size:13px;">'
    
    // Header row
    tableHtml += '<thead style="background-color:#f1f5f9; color:#0f172a; font-weight:bold;"><tr>'
    headers.forEach(h => {
      tableHtml += `<th style="padding:8px 12px; border:1px solid #cbd5e1; text-align:left;">${h}</th>`
    })
    tableHtml += '</tr></thead><tbody>'
    
    // Data rows
    rows.forEach((row, rIndex) => {
      const bg = rIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
      tableHtml += `<tr style="background-color:${bg};">`
      row.forEach(cell => {
        const val = cell === null || cell === undefined ? '' : cell
        const isNumeric = typeof val === 'number' || (!isNaN(val) && !isNaN(parseFloat(val)) && !String(val).includes('-') && !String(val).includes('/'))
        const align = isNumeric ? 'right' : 'left'
        const padding = '8px 12px'
        tableHtml += `<td style="padding:${padding}; border:1px solid #e2e8f0; text-align:${align};">${val}</td>`
      })
      tableHtml += '</tr>'
    })
    
    tableHtml += '</tbody></table>'

    // XML/HTML Template for Excel to enforce grid lines and proper sheet parsing
    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Sheet1</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta charset="UTF-8">
      </head>
      <body>
        ${tableHtml}
      </body>
      </html>
    `

    const base64 = btoa(unescape(encodeURIComponent(template)))
    const res = await window.api.saveFileDialog({
      content: base64,
      defaultName: defaultName,
      filters: [{ name: 'Excel Files (*.xls)', extensions: ['xls'] }]
    })

    if (res.success && !res.cancelled) {
      return { success: true, filePath: res.filePath }
    }
    return { success: false, error: res.error || 'Cancelled' }
  } catch (err) {
    console.error('Excel export error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Generates and prints a PDF report from table data
 * @param {object} shopConfig The current active shop configuration (shopName, address, phone)
 * @param {string} title Report Title
 * @param {string} subtitle Report Subtitle / Details
 * @param {string[]} headers Column headers
 * @param {Array<Array<any>>} rows Rows containing cell values
 * @param {string} defaultName Default name of the saved PDF
 * @param {Array<{label: string, value: string, color?: string}>} summaryCards Optional key value summary cards shown above table
 */
export const exportToPDF = async (shopConfig, title, subtitle, headers, rows, defaultName, summaryCards = []) => {
  try {
    const shopName = shopConfig?.shopName || 'Typing Center'
    const shopAddr = shopConfig?.address || ''
    const shopPhone = shopConfig?.phone || ''
    const printedOn = formatDate(new Date())

    // Build summary cards HTML
    let summaryHtml = ''
    if (summaryCards && summaryCards.length > 0) {
      summaryHtml = '<div style="display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap;">'
      summaryCards.forEach(card => {
        const valColor = card.color || '#5c061e'
        summaryHtml += `
          <div style="flex:1; min-width:140px; border:1px solid #e2e8f0; border-radius:8px; padding:12px; background-color:#f8fafc; box-shadow:0 1px 2px rgba(0,0,0,0.02)">
            <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700; margin-bottom:4px; letter-spacing:0.5px;">${card.label}</div>
            <div style="font-size:18px; font-weight:800; color:${valColor}; font-family:\'Outfit\', sans-serif;">${card.value}</div>
          </div>
        `
      })
      summaryHtml += '</div>'
    }

    // Build table HTML
    let tableHtml = '<table style="width:100%; border-collapse:collapse; font-size:11px; margin-top:8px;">'
    tableHtml += '<thead style="background-color:#5c061e; color:#ffffff;"><tr>'
    headers.forEach(h => {
      tableHtml += `<th style="padding:8px 10px; border:1px solid #cbd5e1; text-align:left; font-weight:700;">${h}</th>`
    })
    tableHtml += '</tr></thead><tbody>'

    rows.forEach((row, rIndex) => {
      const bg = rIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
      tableHtml += `<tr style="background-color:${bg};">`
      row.forEach(cell => {
        const val = cell === null || cell === undefined ? '—' : cell
        const isNumeric = typeof val === 'number' || (typeof cell === 'string' && cell.startsWith('AED') && !cell.includes('/')) || (!isNaN(val) && !isNaN(parseFloat(val)) && !String(val).includes('-') && !String(val).includes('/'))
        const align = isNumeric ? 'right' : 'left'
        tableHtml += `<td style="padding:6px 10px; border:1px solid #e2e8f0; text-align:${align};">${val}</td>`
      })
      tableHtml += '</tr>'
    })

    tableHtml += '</tbody></table>'

    // HTML Template
    const htmlString = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800&display=swap');
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 15px;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #5c061e;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .shop-title {
            font-family: 'Outfit', sans-serif;
            font-size: 20px;
            font-weight: 800;
            color: #5c061e;
            margin: 0 0 4px 0;
          }
          .shop-detail {
            font-size: 11px;
            color: #64748b;
            margin: 0;
          }
          .report-info {
            text-align: right;
          }
          .report-title {
            font-family: 'Outfit', sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 4px 0;
          }
          .report-subtitle {
            font-size: 11px;
            color: #64748b;
            margin: 0;
          }
          .print-tag {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 8px;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div>
            <h1 class="shop-title">${shopName}</h1>
            ${shopAddr ? `<p class="shop-detail">${shopAddr}</p>` : ''}
            ${shopPhone ? `<p class="shop-detail">Phone: ${shopPhone}</p>` : ''}
          </div>
          <div class="report-info">
            <h2 class="report-title">${title}</h2>
            <p class="report-subtitle">${subtitle}</p>
            <div class="print-tag">Printed on: ${printedOn}</div>
          </div>
        </div>

        ${summaryHtml}
        ${tableHtml}
      </body>
      </html>
    `

    const res = await window.api.printToPDF({
      html: htmlString,
      defaultName: defaultName
    })

    if (res.success && !res.cancelled) {
      return { success: true, filePath: res.filePath }
    }
    return { success: false, error: res.error || 'Cancelled' }
  } catch (err) {
    console.error('PDF export error:', err)
    return { success: false, error: err.message }
  }
}
