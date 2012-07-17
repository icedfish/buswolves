'use strict'

var EventEmitter = require('events').EventEmitter


function ServerEventSource() {
	this.buffer = []
	this.events = []
	this.lastEventId = 10000
	this.emitter = new EventEmitter()
}

ServerEventSource.headers = { 'Content-Type': 'text/event-stream' }

ServerEventSource.prototype.nextEventId = function () {
	return this.lastEventId + 1
}
ServerEventSource.prototype.eventIndexOf = function (id) {
}

ServerEventSource.prototype.clear = function (lastEventId) {
	if (lastEventId) {
		var index = this.eventIndexOf(lastEventId) + 1
		this.events.splice(0, index)
	} else {
		this.events = []
	}
}


ServerEventSource.prototype.on = function (event, listener) {
	this.emitter.on(event, listener)
}
ServerEventSource.prototype.once = function (event, listener) {
	this.emitter.once(event, listener)
}
ServerEventSource.prototype.off = function (event, listener) {
	if (listener === undefined)
		this.emitter.removeAllListener(event)
	else
		this.emitter.removeListener(event, listener)
}
ServerEventSource.prototype.fire = function (event, data) {
	var result = this.emitter.emit.apply(this.emitters, arguments)
	
	if (event != 'data')
	var s = data == null ?
			'' : (data.replace(/^/gm, 'data: ') + '\n')
	if (event !== 'message') s += 'event: ' + event + '\n'
	s += 'id: ' + this.nextEventId() + '\n\n'
	this.buffer.push(s)
	this.emitter.emit('data', s)
}
ServerEventSource.prototype.send = function (data) {
	console.log('send', data)
	this.fire('message', data)
}

ServerEventSource.prototype.addClient = function (request, response) {
	response.writeHead(200, ServerEventSource.headers)
	var lastEventId = request.headers['Last-Event-ID']
	var i = lastEventId == null ? 0 :
			parseInt(lastEventId) - this.lastEventId - 1
	while (i < this.buffer.length) {
		response.write(this.buffer[i])
		i++
	}
	var evtSrc = this
	var push = response.write.bind(response)
	evtSrc.on('data', push)
	response.once('close', function(){
		evtSrc.off('data', push)
	})
}


/*
EventSource.prototype.push = function (event, client) {
	client.write(event)
}

EventSource.prototype.send = function (type, data) {
	if (arguments.length === 1) {
		type = 'message'
		data = arguments[0]
	}
	this.events.push({
		type: type,
		data: data.replace(/^/gm, 'data: '),
		id: this.nextId()
	})
setInterval(function () {
	responses.forEach(function () {
		res.write(':noop\n')
	})
}, 15000)

}*/

exports.ServerEventSource = ServerEventSource
