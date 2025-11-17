const WEBDAV_BASE = 'https://192.168.12.100:8087'
const FILE_NAME = 'localStorage_2001.txt'
const USERNAME = '123'
const PASSWORD = '123'

async function request(method, url, body, contentType = 'application/json') {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: 'Basic ' + btoa(`${USERNAME}:${PASSWORD}`),
        'Content-Type': contentType
      },
      body
    })
    return res
  } catch (err) {
    return { error: err }
  }
}

// 统一在同步流程中直接使用 request/fetch 分支，减少薄包装函数数量

function getLocalStorageData() {
  const obj = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    obj[key] = localStorage.getItem(key)
  }
  return obj
}

async function runWebDavSync() {
  const fileUrl = `${WEBDAV_BASE}/${FILE_NAME}`
  try {
    const existsRes = await request('PROPFIND', fileUrl)
    if (existsRes && existsRes.error) { alert(`检查文件失败: ${existsRes.error.message || '网络错误'}`); return }
    const exists = !!(existsRes && (existsRes.status === 207 || existsRes.status === 200))
    if (exists) {
      if (confirm(`检测到服务器存在 ${FILE_NAME}，是否下载覆盖本地？`)) {
        const dlRes = await request('GET', fileUrl)
        if (dlRes && dlRes.error) { alert(`下载失败: ${dlRes.error.message || '网络错误'}`); return }
        if (!dlRes || dlRes.status !== 200) { alert(`下载失败: 状态码 ${dlRes && dlRes.status}`); return }
        const data = await dlRes.text()
        if (data) {
          try {
            const json = JSON.parse(data)
            if (confirm('确认清空并更新本地数据？')) {
              localStorage.clear()
              Object.entries(json).forEach(([k, v]) => localStorage.setItem(k, v))
              const delRes = await request('DELETE', fileUrl)
              const delOK = !!(delRes && !delRes.error && delRes.status >= 200 && delRes.status < 300)
              alert(delOK ? '同步完成并删除服务器文件' : '同步完成，但删除服务器文件失败')
            }
          } catch (e) {
            alert(`数据解析错误: ${e.message || e}`)
          }
        }
      } else {
        if (confirm(`是否删除服务器上的 ${FILE_NAME}？`)) {
          const delRes = await request('DELETE', fileUrl)
          const delOK = !!(delRes && !delRes.error && delRes.status >= 200 && delRes.status < 300)
          alert(delOK ? '已删除服务器文件' : '删除服务器文件失败')
        }
      }
    } else {
      if (confirm(`服务器暂无文件，是否上传当前浏览器数据为 ${FILE_NAME}？`)) {
        const data = JSON.stringify(getLocalStorageData(), null, 2)
        const upRes = await request('PUT', fileUrl, data, 'application/json')
        const ok = !!(upRes && !upRes.error && upRes.status >= 200 && upRes.status < 300)
        alert(ok ? '已上传到服务器' : '上传失败')
      }
    }
  } catch (err) {
    alert(`同步执行失败: ${err.message || err}`)
  }
}

export { runWebDavSync }