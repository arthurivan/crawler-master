const { MongoClient } = require('mongodb')

const URI = 'mongodb+srv://admin:m3105168421@cluster0-r260z.mongodb.net/test?retryWrites=true&w=majority'
const mongoOptions = { useNewUrlParser: true, useUnifiedTopology: true }
const dbname = 'myDb'

function connect (url) {
  return MongoClient.connect(url, mongoOptions).then(client => client.db(dbname))
};

module.exports = async function () {
  const database = await connect(URI)
  return database
}
