const WEBDAV_BASE = 'https://192.168.12.100:8086';
const FILE_NAME = 'localStorage_2001.txt';
const USERNAME = '123';
const PASSWORD = '123';

async function request(method, url, body, contentType = 'application/json') {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: 'Basic ' + btoa(`${USERNAME}:${PASSWORD}`),
        'Content-Type': contentType
      },
      body
    });
    return res;
  } catch (err) {
    return { error: err };
  }
}

async function checkFileExists(url) {
  const res = await request('PROPFIND', url);
  if (res && res.error) {
    alert(`检查文件失败: ${res.error.message || '网络错误'}`);
    return false;
  }
  return res && (res.status === 207 || res.status === 200);
}

async function downloadFile(url) {
  const res = await request('GET', url);
  if (res && res.error) {
    alert(`下载失败: ${res.error.message || '网络错误'}`);
    return null;
  }
  if (!res || res.status !== 200) {
    alert(`下载失败: 状态码 ${res && res.status}`);
    return null;
  }
  return res.text();
}

async function uploadFile(url, data) {
  const res = await request('PUT', url, data, 'application/json');
  if (res && res.error) {
    alert(`上传失败: ${res.error.message || '网络错误'}`);
    return false;
  }
  return !!(res && res.status >= 200 && res.status < 300);
}

async function deleteFile(url) {
  const res = await request('DELETE', url);
  if (res && res.error) {
    alert(`删除失败: ${res.error.message || '网络错误'}`);
    return false;
  }
  return !!(res && res.status >= 200 && res.status < 300);
}

function getLocalStorageData() {
  const obj = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    obj[key] = localStorage.getItem(key);
  }
  return obj;
}

async function runWebDavSync() {
  const fileUrl = `${WEBDAV_BASE}/${FILE_NAME}`;
  try {
    const exists = await checkFileExists(fileUrl);
    if (exists) {
      if (confirm(`检测到服务器存在 ${FILE_NAME}，是否下载覆盖本地？`)) {
        const data = await downloadFile(fileUrl);
        if (data) {
          try {
            const json = JSON.parse(data);
            if (confirm('确认清空并更新本地数据？')) {
              localStorage.clear();
              Object.entries(json).forEach(([k, v]) => localStorage.setItem(k, v));
              const delOK = await deleteFile(fileUrl);
              alert(delOK ? '同步完成并删除服务器文件' : '同步完成，但删除服务器文件失败');
            }
          } catch (e) {
            alert(`数据解析错误: ${e.message || e}`);
          }
        }
      } else {
        if (confirm(`是否删除服务器上的 ${FILE_NAME}？`)) {
          const delOK = await deleteFile(fileUrl);
          alert(delOK ? '已删除服务器文件' : '删除服务器文件失败');
        }
      }
    } else {
      if (confirm(`服务器暂无文件，是否上传当前浏览器数据为 ${FILE_NAME}？`)) {
        const data = JSON.stringify(getLocalStorageData(), null, 2);
        const ok = await uploadFile(fileUrl, data);
        alert(ok ? '已上传到服务器' : '上传失败');
      }
    }
  } catch (err) {
    alert(`同步执行失败: ${err.message || err}`);
  }
}

export { runWebDavSync };
