import * as io from "socket.io-client";
import express from "express";
import * as http from 'http'
import socketIO from 'socket.io'

/**
 * @param  {any} api
 * @param  {string} url
 */
export function client<T>(api: any, url: string) {
  return async function login(username: string, password: string, superadmin: (users: Array<string>)=>Promise<string>):Promise<T> {
    return new Promise<T>((res, rej) => {
      const socket = io.default(url)
      socket.once('new-connection', ()=>{
        socket.once('superadmin', async (users: Array<string>) => {
          username = await superadmin(users);
          socket.emit('superadmin', username)
        })

        socket.once('login-wrong', () => {
          rej(process.env.pwd_wrong || 'Password und Benutzername passen nicht zusammen.')
        })

        socket.once('welcome', () => {
          res(<any>new api(username, socket))
        })

        socket.emit('login', {username, password})
      })
    })
  }
}

/**
 * @param  {any} api
 * @param  {(username:string,password:string)=>Promise<boolean|'superadmin'>} checkLogin
 * @param  {()=>Promise<Array<string>>} getUsers
 * @param  {} PORT=4000
 */
export function server(api: any, checkLogin: (username:string, password: string) => Promise<boolean|'superadmin'>, getUsers: () => Promise<Array<string>>, PORT = 4000) {
  const app = express()
  const server = http.createServer(app)
  const io = socketIO(server)
  server.listen(PORT);

  io.on('connection', function (socket) {
    socket.once('login', async (auth: {username:string, password:string}) => {
      let authOK = await checkLogin(auth.username, auth.password)
      if(authOK === 'superadmin') {
        let users = await getUsers()    
        socket.once('superadmin', (username: string) => {
          new api(username, socket, false)
        })
        socket.emit('superadmin', users)
        return
      }
      if(authOK) {
        new api(auth.username, socket, false)
        socket.emit('welcome')
      } else {
        socket.emit('login-wrong')
        setTimeout(()=>{socket.disconnect()}, 5000)
      }
    })
    socket.emit('new-connection')
  })

  console.log(`SERVER GESTARTET 🚀 auf PORT ${PORT}`)

  return {
    server,
    express: app
  }
}
