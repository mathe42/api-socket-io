# api-socket-io

Docs followes in https://github.com/mathe42/api-socket-io/tree/master/docs

## Was? Warum?
Dieses Packet wird in einer deutschen Website genutzt daher sind viele Dinge damit wir es einfacher haben auf Deutsch. Dies betrifft insbesondere die JSDOC comments für intellisense in VSCode und die Validatoren.

Ziel dieses Packets ist eine Möglichkeit zu schaffen mit wenig aufwand eine API zu erstellen die über Socket.IO läuft und dadurch der Server den Client über änderungen informieren kann.

Das Kernstück ist dabei eine Klasse die sowohl Server als auch Clientseitig verwendet werden kann.
Dabei werden der Klasse Funktionen hinzugefügt wobei die parameter in typescript mit typen versehen werden können. Auch der rückgabetyp kann festgelegt werden. Der Body der Funktion bleibt dabei bisauf ein return leer.

Die Funktionalität ergibt sich dann aus Decoratoren die der Klasse und Funktionen hinzugefügt werden.

## SSL
Wir empfehlen den Server mit SSL zu sichern. Aktuell unterstützt dieses Packet das aber nicht, da wir das bei uns über einen reverse Proxy in einem Docker Container machen. Gerne kannst du aber einen PR erstellen falls du es implementieren möchtest.

## Validator
Wir haben verschiedene Validatoren entwickelt. Diese werden zur validierung der eingehenden Daten verwendet. Auch diese sind aktuell nur auf Deutsch verfügbar.

## Beispiel

```ts
import { stringValidator, numberValidator, booleanValidator, builder, connectorBase, server as server_api, client as client_api } from "api-socket-io";
import { query as query_2 } from "./connector";
 

const {useClass, inform, query, mutation, register, auth} = 
  new builder<string, api>(
    query_2, 
    async (name:string, ...args: Array<any>) => {
      return await query_2(`SELECT ${name}(${args.map(v=>"'" + v + "'").join(',')}) AS r`).then(v=>v[0].r)
    }
  )

const isAdmin = auth(()=>this.usergroup==='admin'?true:'You have to be Admin to use this method.')


@useClass
export class api extends connectorBase {
  @register
  @isAdmin
  @inform('arbeitskreise')
  @mutation('addArbeitskreis', [
    new stringValidator('Bezeichnung').required().maxLength(100).minLength(3)
  ])
  addArbeitskreis(bezeichnung:string):Promise<number> {return}

  @register
  @inform('personen')
  @mutation('addPerson', [
    new stringValidator('Vorname').required().maxLength(50),
    new stringValidator('Nachname').required().maxLength(50),
    new stringValidator('Geburtsdatum').required().isDate(),
    new stringValidator('Geschlecht').required().enum(['m','w'])
  ])
  addPerson(vorname: string, nachname: string, gebDat: string, geschlecht: 'm'|'w'):Promise<number> {return}

  @register
  @query([
    new numberValidator('Arbeitskreis ID').required().ganz().min(1)
  ], [
    (self, akID: number) => ({name: 'default', abfrage: `SELECT * FROM arbeitskreise WHERE ID = ${akID}`}),
    (self, akID: number) => ({name: 'mitglieder', abfrage: `SELECT a.personID, p.vorname, p.nachname, p.gebDat, p.geschlecht, a.date, a.neuerStatus, a.ID FROM person_arbeitskreis a, personen p WHERE p.ID = a.personID AND a.akID = ${akID} ORDER BY p.ID`})
  ])
  arbeitskreis(akID: number):Promise<any>{return}

  constructor(public isClient:boolean, public socket:Socket) {
    super(isClient, socket)
    this.usergroup = 'admin' //get from db
  }
}

export function server() {
  let servers = server_api(api, async (username:string, password:string)=>false, async ()=>[])
}

export function client() {
  return client_api<api>(api, 'localhost:4000')
}

```

## Order of Decorators
Die Reihenfolge soll immer register, auth, inform, nichts/query/mutation sein. So können breaking changes vermieden werden.

## Vue Plugin
Um das intigrierte Vue Plugin nutzen zu können müssen einfach die folgenden Zeilen vor aufruf des Vue Konstruktors hinzu kommen.

```ts
import Vue from 'vue'
import { vuePlugin } from 'api-socket-io'
import { api } from './api'
Vue.use(vuePlugin, {api, url: 'api.example.de'})
```

Dieses Plugin nutzen wir selbst für ein Projekt und haben das daher hier includiert. Falls du änliches für Angular, React etc. gemacht hast erzeuge gerne ein PR.

## Was ist geplant? / What is planed?
Viele Funktionen werden noch folgen - beispielsweise validatoren wenn wir sie selbst brauchen. 
* Beispiele
* Docs in English
* Optimisation
* ...