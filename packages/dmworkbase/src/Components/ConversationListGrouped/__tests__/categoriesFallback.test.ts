import { describe, expect, it } from "vitest"
import {
    computeEffectiveCategories,
    isVirtualCategory,
    VIRTUAL_DEFAULT_CATEGORY_ID,
    type ValidCategoryItem,
} from "../categoriesFallback"

describe("isVirtualCategory", () => {
    it("识别虚拟默认分组的 category_id 前缀", () => {
        expect(isVirtualCategory(VIRTUAL_DEFAULT_CATEGORY_ID)).toBe(true)
        expect(isVirtualCategory(`${VIRTUAL_DEFAULT_CATEGORY_ID}-xx`)).toBe(true)
    })

    it("后端真实 UUID 不会被识别为虚拟", () => {
        expect(isVirtualCategory("3d2a9f4c-5b5f-4b3f-9c2a-0a7f2d1b4e12")).toBe(false)
        expect(isVirtualCategory("default")).toBe(false)
        expect(isVirtualCategory(null)).toBe(false)
        expect(isVirtualCategory(undefined)).toBe(false)
        expect(isVirtualCategory("")).toBe(false)
    })
})

describe("computeEffectiveCategories", () => {
    it("场景 1: categories=[] 时兜底一个虚拟默认分组", () => {
        const result = computeEffectiveCategories([])

        expect(result).toHaveLength(1)
        const [virtualCat] = result
        expect(virtualCat.category_id).toBe(VIRTUAL_DEFAULT_CATEGORY_ID)
        expect(virtualCat.is_default).toBe(true)
        expect(virtualCat.name).toBe("默认")
        expect(virtualCat.groups).toEqual([])
        expect(isVirtualCategory(virtualCat.category_id)).toBe(true)
    })

    it("场景 2: 后端返回真 categories 时走原逻辑，不注入虚拟分组", () => {
        const real: ValidCategoryItem[] = [
            {
                category_id: "3d2a9f4c-5b5f-4b3f-9c2a-0a7f2d1b4e12",
                name: "默认分组",
                sort: 0,
                groups: [],
                is_default: true,
            },
            {
                category_id: "7fa8b2c1-1111-2222-3333-444455556666",
                name: "工作",
                sort: 1,
                groups: [{ group_no: "g1", name: "A", category_sort: 0 }],
            },
        ]

        const result = computeEffectiveCategories(real)

        // 直接返回原数组（引用相等），确保不做多余拷贝
        expect(result).toBe(real)
        // 无虚拟分组渗入
        expect(result.some(c => isVirtualCategory(c.category_id))).toBe(false)
    })
})
