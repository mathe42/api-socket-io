import { client } from "./cons";

export { builder, connectorBase } from "./apiBuilder"
export { server, client } from './cons'
export { stringValidator, numberValidator, booleanValidator } from "./validatoren";

export const vuePlugin = {
  install(Vue: any, ops: {api: any, url: string}) {
    Vue.prototype.$login = async (username: string, password: string, superadmin: (users: Array<string>)=>Promise<string>) => {
      Vue.prototype.$api = await client<any>(ops.api, ops.url)(username, password, superadmin)
      return Vue.prototype.$api
    }
  }
}