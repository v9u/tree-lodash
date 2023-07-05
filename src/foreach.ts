import type { ChildrenKey, Tree, Strategy } from "./types";

export type ForeachOptions = {
  childrenKey?: ChildrenKey
  strategy?: Strategy
}

export type ForeachCallbackMeta<T extends ChildrenKey> = {
  depth: number,
  parents?: Tree<T>[]
}

export type ForeachCallback<T extends ChildrenKey> = (treeItem: Tree<T>, meta: ForeachCallbackMeta<T>) => void

export type Foreach<T extends ChildrenKey> = (tree: Tree<T> | Tree<T>[], callback: ForeachCallback<T>, options?: ForeachOptions) => void

type ForeachInnerOption<T extends ChildrenKey> = {
  childrenKey: ChildrenKey
  parents: Tree<T>[],
  depth: number
}


type ForeachImpl<T extends ChildrenKey> = (treeItem: Tree<T>, callback: ForeachCallback<T>, options: ForeachInnerOption<T>) => void


// 前置遍历
const preImpl: ForeachImpl<ChildrenKey> = (treeItem, callback, options) => {
  callback(treeItem, options)
  const children = treeItem[options.childrenKey]
  if (children && Array.isArray(children)) {
    children.forEach((childItem) => {
      preImpl(childItem, callback, {
        ...options,
        parents: [...options.parents, treeItem],
        depth: options.depth + 1
      })
    })
  }
}

// 后置遍历
const postImpl: ForeachImpl<ChildrenKey> = (treeItem, callback, options) => {
  const children = treeItem[options.childrenKey]
  if (children && Array.isArray(children)) {
    children.forEach((childItem) => {
      preImpl(childItem, callback, {
        ...options,
        parents: [...options.parents, treeItem],
        depth: options.depth + 1
      })
    })
  }
  callback(treeItem, options)
}


type QueueItem = {
  tree: Tree<ChildrenKey>,
  options: ForeachInnerOption<ChildrenKey>
}

// 广度优先遍历
const breadth: ForeachImpl<ChildrenKey> = (treeItem, callback, options) => {
  const queue: QueueItem[] = [
    {
      tree: treeItem,
      options
    }
  ]
  const runQueue = () => {
    if (queue.length === 0) {
      return
    }
    const queueItem = queue.shift() as QueueItem
    const treeItem = queueItem.tree
    if (treeItem[options.childrenKey] && Array.isArray(treeItem[options.childrenKey])) {
      const subQueueItems = treeItem[options.childrenKey].map(subTree => (
        {
          tree: subTree,
          options: {
            ...queueItem.options,
            parents: [...queueItem.options.parents, treeItem],
            depth: queueItem.options.depth + 1
          }
        }
      ))
      queue.push(...subQueueItems)
    }
    callback(treeItem, queueItem.options)
    runQueue()
  }
  runQueue()
}

const strategies = {
  'pre': preImpl,
  'post': postImpl,
  'breadth': breadth
}

const foreach: Foreach<ChildrenKey> = (tree, callback, options = {}) => {
  const childrenKey = options?.childrenKey ?? 'children'
  const strategy = options.strategy ?? 'pre'
  const isForest = Array.isArray(tree)
  const method = strategies[strategy]
  const innerOptions = {
    childrenKey,
    depth: 0,
    parents: []
  }
  isForest ? tree.forEach(tree => {
    method(tree, callback, innerOptions)
  }) : method(tree, callback, innerOptions)
}

export default foreach;