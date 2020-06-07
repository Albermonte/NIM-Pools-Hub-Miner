var ping = require('ping');

const Nimiq = require('@nimiq/core');
class ServerFinder{
    async findClosestServers(_servers, port){
        this.servers = [];
        for(let server of _servers){
            let result = await ping.promise.probe(server);
            this.servers.push({host: server, time: result.time });
            Nimiq.Log.i(ServerFinder, `${server} - ${result.time}ms`);
        }
        let sorted = this.servers.sort(function (a, b) {
            return a.time > b.time;
        });

        return sorted;
    }
}

module.exports = ServerFinder;