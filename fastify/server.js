/* eslint-disable */
const fastify = require('fastify')({ logger: true })


// Declare a route
fastify.post('/', (request, reply) => {

  reply.header('Access-Control-Allow-Origin', '*');
  console.log(request)

})


// Run the server!
const start = async () => {
  try {
    await fastify.listen({ port: 4000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()

