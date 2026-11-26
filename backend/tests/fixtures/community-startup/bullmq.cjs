const { EventEmitter } = require('node:events')

class Queue extends EventEmitter {
  constructor(name, opts) {
    super()
    this.name = name
    this.opts = opts
  }

  async close() {}
}

exports.Queue = Queue
exports.Worker = class Worker extends Queue {}
exports.QueueEvents = class QueueEvents extends Queue {}
exports.FlowProducer = class FlowProducer extends Queue {}
