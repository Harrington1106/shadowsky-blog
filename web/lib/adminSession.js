/**
 * 后台会话相关的前端常量。
 * 单独放一个文件是因为登录页和 AdminShell 都要用,而这俩不是父子关系,
 * 靠 sessionStorage 传一次性信号(只在当前标签页有效,刷新后不会重复弹)。
 */

/** 刚登录成功的标记 —— AdminShell 读到就弹一次欢迎 toast 并立刻删掉 */
export const JUST_LOGGED_IN_KEY = 'sq_just_logged_in';
