import APIClient from "./APIClient"

export interface CategoryGroup {
    group_no: string
    name: string
    category_sort: number
}

export interface CategoryItem {
    category_id: string | null
    name: string
    sort: number
    groups: CategoryGroup[]
}

export interface CreateCategoryReq {
    name: string
}

export interface UpdateCategoryReq {
    name: string
}

export interface SortCategoriesReq {
    category_ids: string[]
}

export interface MoveGroupToCategoryReq {
    category_id: string  // 空字符串 = 移出分类
}

const CategoryService = {
    /** 获取分组列表（含各分组下群聊） */
    list(spaceId: string): Promise<CategoryItem[]> {
        return APIClient.shared.get<CategoryItem[]>(`/spaces/${spaceId}/categories`)
    },

    /** 创建分组 */
    create(spaceId: string, req: CreateCategoryReq): Promise<CategoryItem> {
        return APIClient.shared.post(`/spaces/${spaceId}/categories`, req)
    },

    /** 重命名分组 */
    update(spaceId: string, categoryId: string, req: UpdateCategoryReq): Promise<void> {
        return APIClient.shared.put(`/spaces/${spaceId}/categories/${categoryId}`, req)
    },

    /** 删除分组 */
    delete(spaceId: string, categoryId: string): Promise<void> {
        return APIClient.shared.delete(`/spaces/${spaceId}/categories/${categoryId}`)
    },

    /** 批量排序分组 */
    sort(spaceId: string, req: SortCategoriesReq): Promise<void> {
        return APIClient.shared.put(`/spaces/${spaceId}/categories/sort`, req)
    },

    /** 移动群聊到分组 */
    moveGroupToCategory(groupNo: string, req: MoveGroupToCategoryReq): Promise<void> {
        return APIClient.shared.put(`/groups/${groupNo}/category`, req)
    },
}

export default CategoryService
