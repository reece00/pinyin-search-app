globalThis.localStorage = {
  getItem() { return null },
  setItem() {},
  removeItem() {}
}
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-test' }, configurable: true })
Object.defineProperty(globalThis, 'location', { value: { href: 'http://localhost:8080/', hostname: 'localhost', search: '?debug=true' }, configurable: true })
globalThis.pinyinPro = {
  pinyin(text) {
    const map = { 北: 'b', 京: 'j', 朝: 'c', 阳: 'y', 海: 'h', 淀: 'd' }
    return String(text || '').split('').map(ch => map[ch] || 'x')
  }
}

const { __test__ } = await import('../public/js/features.js')
__test__.setPinyinLib(globalThis.pinyinPro)

const tests = []
const record = (name, pass, detail = '') => tests.push({ name, pass, detail })

const inputLf = '朝阳路1号\n备注A\n\n海淀路2号\n备注B'
const parsedLf = __test__.parseAddressContent(inputLf, 'lf')
record('LF 解析条目数', parsedLf.length === 2, `actual=${parsedLf.length}`)

const inputCrlf = '朝阳路1号\r\n备注A\r\n\r\n海淀路2号\r\n备注B'
const parsedCrlf = __test__.parseAddressContent(inputCrlf, 'crlf')
record('CRLF 解析条目数', parsedCrlf.length === 2, `actual=${parsedCrlf.length}`)

const inputSingle = '只有一行地址'
const parsedSingle = __test__.parseAddressContent(inputSingle, 'single')
record('单行块过滤', parsedSingle.length === 0, `actual=${parsedSingle.length}`)

const items = [
  { address: '朝阳路1号', notes: '备注A', pinyinIndex: __test__.generatePinyinIndex('朝阳路1号') },
  { address: '海淀路2号', notes: '备注B', pinyinIndex: __test__.generatePinyinIndex('海淀路2号') }
]

const hitChinese = __test__.searchAddresses(items, '朝阳')
record('中文关键词命中', hitChinese.length === 1 && hitChinese[0].address.includes('朝阳'), `actual=${hitChinese.length}`)

const hitPinyin = __test__.searchAddresses(items, 'cy')
record('拼音关键词命中', hitPinyin.length >= 1 && hitPinyin.some(it => it.address.includes('朝阳')), `actual=${hitPinyin.length}`)

// 建议 B: 增加搜索边界用例
const hitEmpty = __test__.searchAddresses(items, '')
record('空字符串搜索 (返回全部)', hitEmpty.length === 2, `actual=${hitEmpty.length}`)

const hitWhitespace = __test__.searchAddresses(items, '   ')
record('仅空格搜索 (返回全部)', hitWhitespace.length === 2, `actual=${hitWhitespace.length}`)

const hitNoMatch = __test__.searchAddresses(items, '不存在的地址')
record('无匹配项搜索', hitNoMatch.length === 0, `actual=${hitNoMatch.length}`)

const hitCaseInsensitive = __test__.searchAddresses(items, 'CY')
record('大写拼音搜索', hitCaseInsensitive.length >= 1 && hitCaseInsensitive.some(it => it.address.includes('朝阳')), `actual=${hitCaseInsensitive.length}`)

const hitWithSpecialChars = __test__.searchAddresses(items, '路')
record('含中文搜索 (匹配全部)', hitWithSpecialChars.length === 2, `actual=${hitWithSpecialChars.length}`)

const hitNoCrashSpecial = __test__.searchAddresses(items, '路!')
record('含不存在特殊字符 (无匹配且不崩溃)', hitNoCrashSpecial.length === 0, `actual=${hitNoCrashSpecial.length}`)

const passCount = tests.filter(t => t.pass).length
const failCount = tests.length - passCount
const summary = { total: tests.length, pass: passCount, fail: failCount, tests }

console.log(JSON.stringify(summary, null, 2))
if (failCount > 0) process.exit(1)
