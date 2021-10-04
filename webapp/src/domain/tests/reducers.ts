import * as actionTypes from "./actionTypes"
import { Map } from "immutable"
import { Access } from "../../auth"
import { ThunkDispatch } from "redux-thunk"
import { Hook } from "../hooks/reducers"

export interface Token {
    id: number
    description: string
    permissions: number
}

export interface ViewComponent {
    headerName: string
    accessors: string
    render: string | Function | undefined
    headerOrder: number
}

export interface View {
    name: string
    components: ViewComponent[]
}

export interface StalenessSettings {
    tags: any
    maxStaleness?: number
}

export interface Test {
    id: number
    name: string
    description: string
    compareUrl: string | Function | undefined
    tags: string
    tagsCalculation?: string
    owner: string
    access: Access
    tokens: Token[]
    defaultView?: View
    count?: number // run count in AllTests
    watching?: string[]
    notificationsEnabled: boolean
    stalenessSettings?: StalenessSettings[]
}

export class TestsState {
    byId?: Map<number, Test> = undefined
    loading: boolean = false
    // we need to store watches independently as the information
    // can arrive before the actual test list
    watches: Map<number, string[] | undefined> = Map<number, string[] | undefined>()
}

export interface LoadingAction {
    type: typeof actionTypes.LOADING
    isLoading: boolean
}

export interface LoadedSummaryAction {
    type: typeof actionTypes.LOADED_SUMMARY
    tests: Test[]
}

export interface LoadedTestAction {
    type: typeof actionTypes.LOADED_TEST
    test: Test
}

export interface DeleteAction {
    type: typeof actionTypes.DELETE
    id: number
}

export interface UpdateAccessAction {
    type: typeof actionTypes.UPDATE_ACCESS
    id: number
    owner: string
    access: Access
}

export interface UpdateTestWatchAction {
    type: typeof actionTypes.UPDATE_TEST_WATCH
    byId: Map<number, string[] | undefined>
}

export interface UpdateViewAction {
    type: typeof actionTypes.UPDATE_VIEW
    testId: number
    view: View
}

export interface UpdateHookAction {
    type: typeof actionTypes.UPDATE_HOOK
    testId: number
    hook: Hook
}

export interface UpdateTokensAction {
    type: typeof actionTypes.UPDATE_TOKENS
    testId: number
    tokens: Token[]
}

export interface RevokeTokenAction {
    type: typeof actionTypes.REVOKE_TOKEN
    testId: number
    tokenId: number
}

export type TestAction =
    | LoadingAction
    | LoadedSummaryAction
    | LoadedTestAction
    | DeleteAction
    | UpdateAccessAction
    | UpdateTestWatchAction
    | UpdateViewAction
    | UpdateHookAction
    | UpdateTokensAction
    | RevokeTokenAction

export type TestDispatch = ThunkDispatch<any, unknown, TestAction>

export const reducer = (state = new TestsState(), action: TestAction) => {
    switch (action.type) {
        case actionTypes.LOADING:
            state.loading = action.isLoading
            break
        case actionTypes.LOADED_SUMMARY:
            {
                state.loading = false
                var byId = Map<number, Test>()
                action.tests.forEach(test => {
                    byId = byId.set(test.id, test)
                })
                state.byId = byId
            }
            break
        case actionTypes.LOADED_TEST:
            state.loading = false
            if (!state.byId) {
                state.byId = Map<number, Test>()
            }
            state.byId = (state.byId as Map<number, Test>).set(action.test.id, action.test)
            break
        case actionTypes.UPDATE_ACCESS:
            {
                let test = state.byId?.get(action.id)
                if (test) {
                    state.byId = state.byId?.set(action.id, { ...test, owner: action.owner, access: action.access })
                }
            }
            break
        case actionTypes.DELETE:
            {
                state.byId = state.byId?.delete(action.id)
            }
            break
        case actionTypes.UPDATE_TEST_WATCH:
            {
                state.watches = state.watches.merge(action.byId)
            }
            break
        case actionTypes.UPDATE_VIEW:
            {
                let test = state.byId?.get(action.testId)
                if (test) {
                    state.byId = state.byId?.set(action.testId, { ...test, defaultView: action.view })
                }
            }
            break
        case actionTypes.UPDATE_TOKENS:
            {
                let test = state.byId?.get(action.testId)
                if (test) {
                    state.byId = state.byId?.set(action.testId, { ...test, tokens: action.tokens })
                }
            }
            break
        case actionTypes.REVOKE_TOKEN:
            {
                let test = state.byId?.get(action.testId)
                if (test) {
                    state.byId = state.byId?.set(action.testId, {
                        ...test,
                        tokens: test.tokens.filter(t => t.id !== action.tokenId),
                    })
                }
            }
            break
        case actionTypes.UPDATE_HOOK:
            {
                //TODO: define state changes
            }
            break
        default:
    }
    return state
}
