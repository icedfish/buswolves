'use strict'

var EventEmitter = require('events').EventEmitter


function ServerEventSource() {
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
	
	if (event === 'sse') return
	
	var id = this.nextEventId()
	
	var s = data == null ?
			'' : (data.replace(/^/gm, 'data: ') + '\n')
	if (event !== 'message') s += 'event: ' + event + '\n'
	if (id != null) s += 'id: ' + id + '\n'
	s += '\n'
	
	var evt = {
		type: event,
		data: data,
		lastEventId: id,
		toString: function() { return s }
	}
	this.events.push(evt)
	this.emitter.emit('sse', evt)
}
ServerEventSource.prototype.send = function (data) {
	console.log('send', data)
	this.fire('message', data)
}

ServerEventSource.prototype.addClient = function (request, response, filter) {
	response.writeHead(200, ServerEventSource.headers)
	
	var push = filter == null ?
		function (evt) { response.write(evt.toString()) } :
		function (evt) { if (filter(evt)) response.write(evt.toString()) }
	
	var lastEventId = request.headers['Last-Event-ID']
	var i = lastEventId == null ? 0 :
			parseInt(lastEventId) - this.lastEventId - 1
	while (i < this.events.length) {
		push(this.events[i])
		i++
	}
	
	var evtSrc = this
	evtSrc.on('sse', push)
	response.once('close', function(){
		evtSrc.off('sse', push)
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
