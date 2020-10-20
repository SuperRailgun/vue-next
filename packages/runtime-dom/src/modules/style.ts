import { isString, hyphenate, capitalize, isArray } from '@vue/shared'
import { camelize } from '@vue/runtime-core'

// string | string: { string | string[] } | null
// Record 类似于生成对象
type Style = string | Record<string, string | string[]> | null

export function patchStyle(el: Element, prev: Style, next: Style) {
  const style = (el as HTMLElement).style
  if (!next) {
    el.removeAttribute('style')
    // val is string 这样使用 下面的 if 语句块 next 就会是 string
    // else 就会是另外一种类型
  } else if (isString(next)) {
    if (prev !== next) {
      style.cssText = next
    }
  } else {
    // TODO: 这里为啥用 in 而不用 hasOwnProperty
    for (const key in next) {
      setStyle(style, key, next[key])
    }
    // 去掉之前的 style
    if (prev && !isString(prev)) {
      for (const key in prev) {
        if (next[key] == null) {
          setStyle(style, key, '')
        }
      }
    }
  }
}

const importantRE = /\s*!important$/

function setStyle(
  style: CSSStyleDeclaration,
  name: string,
  val: string | string[]
) {
  if (isArray(val)) {
    // 铺平递归
    val.forEach(v => setStyle(style, name, v))
  } else {
    // CSS variable
    if (name.startsWith('--')) {
      // custom property definition
      style.setProperty(name, val)
    } else {
      const prefixed = autoPrefix(style, name)
      if (importantRE.test(val)) {
        // !important
        style.setProperty(
          hyphenate(prefixed),
          val.replace(importantRE, ''),
          'important'
        )
      } else {
        style[prefixed as any] = val
      }
    }
  }
}

const prefixes = ['Webkit', 'Moz', 'ms']
const prefixCache: Record<string, string> = {}

function autoPrefix(style: CSSStyleDeclaration, rawName: string): string {
  // 缓存提升性能, 且只对用的的进行处理和缓存
  const cached = prefixCache[rawName]
  if (cached) {
    return cached
  }
  // 符合 css 命名
  let name = camelize(rawName)
  // name in style 列举了所有的 css key
  // 如果已经是平台所拥有的就不用再进行 prefix 了
  if (name !== 'filter' && name in style) {
    return (prefixCache[rawName] = name)
  }
  // 首字母大写
  name = capitalize(name)
  for (let i = 0; i < prefixes.length; i++) {
    const prefixed = prefixes[i] + name
    if (prefixed in style) {
      return (prefixCache[rawName] = prefixed)
    }
  }
  // 如果不正确就不缓存了，以防数组太大
  return rawName
}
