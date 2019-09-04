import { param } from "./validatoren";
import { Socket } from "socket.io";
import { EventEmitter } from "events";

export class builder<R,T extends connectorBase> {
  private methods: Array<string> = []
  private instances: Array<T> = []

  
  private dbAbfrage: (abfrage:R|Array<R>)=>Promise<any|Array<any>>
  private dbExecute: (name: string, ...args:Array<any>)=>Promise<number|string|boolean>

  
  /**
   * Builder für Server
   * @param  {(abfrage:R|Array<R>)=>(Promise<any>|Promise<Array<any>>)} dbAbfrage
   * @param  {(name:string,...args:Array<any>)=>Promise<number|string|boolean>} dbExecute
   */
  constructor(dbAbfrage: (abfrage:R|Array<R>)=>(Promise<any>|Promise<Array<any>>), dbExecute: (name: string, ...args:Array<any>)=>Promise<number|string|boolean>)
  /**
   * Builder Constructor für Client
   */
  constructor()
  constructor(dbAbfrage?: (abfrage:R|Array<R>)=>(Promise<any>|Promise<Array<any>>), dbExecute?: (name: string, ...args:Array<any>)=>Promise<number|string|boolean>) {
    if (dbAbfrage && dbExecute) {
      this.dbAbfrage = dbAbfrage
      this.dbExecute = dbExecute
    }
  }
  /**
   * Generieren einer zufälligen UUID zur identifizierung von Anfragen
   * @returns string
   */
  private UUID():string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);return v.toString(16);});
  }
  /**
   * Registrierung der Methoden für SocketIO
   * @param  {any} target
   * @param  {string} propertyKey
   * @param  {PropertyDescriptor} descriptor
   */
  register() {
    let ME = this

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      ME.methods.push(propertyKey);
    }
  } 
  
  /**
   * Manipuliert die Klasse für API einsatz
   * @param {K} constructor 
   */
  useClass() {
    let ME = this
    return function <K extends {new(...args:any[]):{}}>(constructor:K) {
      return class extends constructor {
        constructor(...args:any[]) {
          super(...args)
          let self: T = <any>this

          if (self.isClient) {
            self.socket.on('inform', (name: string, id?: number) => self.ee.emit(name, id))
          } else {
            ME.methods.forEach((method) => {
              self.socket.on(method, 
                (id:string, ...args: any[]) => {
                  this[method](...args)
                    .then(result=>{
                      self.socket.emit(`${id}-result`, result)
                    })
                    .catch(err => {
                      self.socket.emit(`${id}-error`, err)
                    })
                })
            })

            ME.instances.push(<any>this)
            self.socket.emit('welcome')
          }
        }
      }
    }
  }

  /**
   * Mutation der Daten. Mit Validatoren.
   * @param  {string} mutationName
   * @param  {Array<param>} params
   */
  mutation(mutationName: string, params:Array<param>) {
    let ME = this

    return function (target:any, propertyKey: string, descriptor: PropertyDescriptor) {
      descriptor.value = function(...args: (number | boolean | string)[]) {
        const self: T = this;
        return new Promise((res, rej) => {
          const fehler = ME.validate(params, ...args)

          if (fehler!==true) {
            rej(fehler)
            return
          }

          if (self.isClient) {
            ME.clientHandler(self, mutationName, args, res, rej)
          } else {
            ME.dbExecute(mutationName, ...args).then(res).catch(rej)
          }
        })
      }
    }
  }
  
  /**
   * @param  {T} self
   * @param  {} name
   * @param  {} args
   * @param  {} res
   * @param  {} rej
   */
  private clientHandler(self: T, name, args, res, rej) {
    const id = this.UUID();
    self.socket.once(`${id}-error`, rej);
    self.socket.once(`${id}-result`, res);
    self.socket.emit(name, ...args);
  }
  
  query(
    params: Array<param>,
    abfragen: Array<(self: T,...args: any[]) => {name: string, abfrage: R} | null>
  ) {
    let ME = this

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      descriptor.value = function(...args: (number | boolean | string)[]) {
        const self: T = this;

        return new Promise(async (res, rej) => {
          const fehler = ME.validate(params, ...args)

          if (fehler!==true) {
            rej(fehler)
            return
          }

          if (self.isClient) {
            ME.clientHandler(self, propertyKey, args, res, rej)
          } else {
            let abfragenMap = abfragen.map(v => v(self, ...args));

            let result:Array<any> = await ME.dbAbfrage(abfragenMap.map(v=>v.abfrage)) 

            let r: any = {};
            
            result.forEach((v, i)=>{
              r[abfragenMap[i].name] = v.result;
            })

            res(r)
          }
        });
      };
    };
  }

  inform(informs: Array<{infoName: string, idValue?: number, query?: (self: T,...args: Array<string|number|boolean>) => R, queryHandler?: (res: any)=>number}>)
  inform(name: string, valID?:number)
  inform(informsName: Array<{infoName: string, idValue?: number, query?: (self: T,...args: Array<string|number|boolean>) => R, queryHandler?: (res: any)=>number}>|string, valID?:number) {
    let ME = this

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const old = descriptor.value
      const self: T = this;
    
      descriptor.value = function (...args:Array<any>) {
        setImmediate(() => {
          if (typeof informsName === 'string') {
            if (valID) {
              ME.instances.forEach(inst => {
                inst.socket.emit('inform', informsName, args[valID])
              })
            } else {
              ME.instances.forEach(inst => {
                inst.socket.emit('inform', informsName)
              })
            }
          } else {
            informsName.forEach(info => {
              if (info.idValue) {
                ME.instances.forEach(inst => {
                  inst.socket.emit('inform', info.infoName, args[info.idValue])
                })
              } else if (info.query) {
                ME.dbAbfrage(info.query(self, ...args))
                .then((res:any)=>{
                  if (info.queryHandler) {
                    return info.queryHandler(res)
                  } else {
                    return res[0].id
                  }
                })
                .then((res) => {
                  ME.instances.forEach(inst => {
                    inst.socket.emit('inform', info.infoName, res)
                  })
                })
              } else {
                ME.instances.forEach(inst => {
                  inst.socket.emit('inform', info.infoName)
                })
              }
            })
          }
        })

        return old(...args)
      }
    }
  }

  private validate(params:Array<param>,...args:(number | boolean | string)[]) {
    const fehler = params
      .map((par, id) =>
        par.valiatoren
          .map(validator => validator(args[id]))
          .filter(valid => valid !== true)
          .join("\n")
      )
      .filter(fehler => fehler !== "")
      .join("\n");

    if (fehler.length > 0) {
      return fehler
    }
    return true
  }

  auth(
    check: () => true | string
  ) {
    let ME = this

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      let old = descriptor.value

      descriptor.value = function(...args: (number | boolean | string)[]) {
        return new Promise((res, rej) => {
          let err = check.call(this)

          if (err === true) {
            old(...args).then(res).catch(rej)
          } else {
            rej(err)
          }
        })
      };
    };
  }

}


export abstract class connectorBase {
  ee: EventEmitter = new EventEmitter()
  constructor(public isClient:boolean, public socket:Socket) {}
}
