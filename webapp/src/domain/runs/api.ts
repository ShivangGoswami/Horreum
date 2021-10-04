import { fetchApi } from "../../services/api"
import { Access, accessName } from "../../auth"
import { PaginationInfo, paginationParams } from "../../utils"

const base = "/api/run"
const endPoints = {
    getRun: (runId: number, token?: string) => `${base}/${runId}${token ? "?token=" + token : ""}`,
    addRun: () => `${base}/`,
    query: (runId: number, query: string, array: boolean, schemaUri?: string) =>
        `${base}/${runId}/query?query=${encodeURIComponent(query)}&array=${array}${
            schemaUri ? "&uri=" + schemaUri : ""
        }`,
    list: (query: string, matchAll: boolean, roles: string, pagination: PaginationInfo, trashed: boolean) =>
        `${base}/list?${paginationParams(pagination)}&query=${encodeURIComponent(
            query
        )}&matchAll=${matchAll}&roles=${roles}&trashed=${trashed}`,
    suggest: (query: string, roles: string) => `${base}/autocomplete?query=${encodeURIComponent(query)}&roles=${roles}`,
    listByTest: (testId: number, pagination: PaginationInfo, trashed: boolean, tags: string) =>
        `${base}/list/${testId}?${paginationParams(pagination)}&trashed=${!!trashed}&tags=${tags}`,
    listBySchema: (uri: string, pagination: PaginationInfo) =>
        `${base}/bySchema?uri=${encodeURIComponent(uri)}&${paginationParams(pagination)}`,
    resetToken: (runId: number) => `${base}/${runId}/resetToken`,
    dropToken: (runId: number) => `${base}/${runId}/dropToken`,
    updateAccess: (runId: number, owner: string, access: Access) =>
        `${base}/${runId}/updateAccess?owner=${owner}&access=${accessName(access)}`,
    trash: (runId: number, isTrashed: boolean) => `${base}/${runId}/trash?isTrashed=${isTrashed}`,
    description: (runId: number) => `${base}/${runId}/description`,
    count: (testId: number) => `${base}/count?testId=${testId}`,
    schema: (runId: number, path?: string) => `${base}/${runId}/schema${(path && "?path=" + path) || ""}`,
}

export const get = (id: number, token?: string) => {
    return fetchApi(endPoints.getRun(id, token), null, "get")
}

export function query(id: number, query: string, array: boolean, schemaUri?: string) {
    return fetchApi(endPoints.query(id, query, array, schemaUri), null, "get")
}

export const byTest = (id: number, pagination: PaginationInfo, trashed: boolean, tags: string) =>
    fetchApi(endPoints.listByTest(id, pagination, trashed, tags), null, "get")

export function list(query: string, matchAll: boolean, roles: string, pagination: PaginationInfo, trashed: boolean) {
    return fetchApi(endPoints.list(query, matchAll, roles, pagination, trashed), null, "get")
}

export function listBySchema(uri: string, pagination: PaginationInfo) {
    return fetchApi(endPoints.listBySchema(uri, pagination), null, "get")
}

export const suggest = (query: string, roles: string) => fetchApi(endPoints.suggest(query, roles), null, "get")

export const resetToken = (id: number) => fetchApi(endPoints.resetToken(id), null, "post", {}, "text")

export const dropToken = (id: number) => fetchApi(endPoints.dropToken(id), null, "post")

export const updateAccess = (id: number, owner: string, access: Access) => {
    // TODO: fetchival does not support form parameters, it tries to JSONify everything
    return fetchApi(endPoints.updateAccess(id, owner, access), null, "post", {}, "response")
    //                   "owner=" + encodeURIComponent(owner) + "&access=" + encodeURIComponent(access),
    //                   'post', { 'content-type' : 'application/x-www-form-urlencoded'}, 'response')
}

export const trash = (id: number, isTrashed: boolean) =>
    fetchApi(endPoints.trash(id, isTrashed), null, "post", {}, "text")

export const updateDescription = (id: number, description: string) => {
    return fetchApi(endPoints.description(id), description, "post", { "Content-Type": "text/plain" }, "response")
}

export type RunCount = {
    active: number
    trashed: number
    total: number
}

export const runCount = (testId: number): Promise<RunCount> => fetchApi(endPoints.count(testId), null, "get")

export const updateSchema = (id: number, path: string | undefined, schema: string) => {
    return fetchApi(endPoints.schema(id, path), schema, "post", { "Content-Type": "text/plain" })
}
