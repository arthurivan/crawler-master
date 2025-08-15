const initDatabase = require('./db')
const server = require('./server')
const collection = 'urls'

initDatabase().then((db) => {
  server(db)
}).catch(err => {
  console.error('Failed to make all database connections!')
  console.error(err)
  process.exit(1)
})
