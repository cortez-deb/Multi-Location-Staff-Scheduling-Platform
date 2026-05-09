// ShiftSync — Custom server with Socket.io
import { createServer } from 'http'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { initSocketServer } from './lib/socket'

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'

const app = next({ dev, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      credentials: true,
    },
    // Avoid conflicts with Next.js routes
    path: '/api/socket',
  })

  // Store io on global so API routes can access it
  initSocketServer(io)

  httpServer.listen(port, () => {
    console.log(`> ShiftSync ready on http://localhost:${port}`)
  })
})
