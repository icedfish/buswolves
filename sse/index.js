'use strict'

var EventEmitter = require('events').EventEmitter


function ServerEventSource(option) {
	this.option = option || {}
	this.events = []
	this.bufferSize = 0
	this.lastEventId = this.option.firstEventId || 10000
	this.emitter = new EventEmitter()
}

ServerEventSource.headers = { 'Content-Type': 'text/event-stream' }

ServerEventSource.prototype.nextEventId = function () {
	return this.option.trackEventId ? ++this.lastEventId : null
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
		timeStamp: Date.now(),
		toString: function() { return s }
	}
	if (this.option.maxBufferSize) {
		this.bufferSize += s.length
		if (this.bufferSize > this.option.maxBufferSize) this.clear()
		this.events.push(evt)
	}
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
		function (evt) {
			try {
				if (filter(evt)) {
					response.write(evt.toString())
				}
			} catch(e) {}
		}
	
	var lastEventId = request.headers['Last-Event-ID']
	var i = lastEventId == null ? 0 :
			parseInt(lastEventId) - this.lastEventId - 1
	if (!(i >= 0)) i = 0
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
