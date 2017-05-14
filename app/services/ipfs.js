const IPFS = require('ipfs');

const ipfs = new IPFS();

function IPFSService() {

}

IPFSService.prototype.save = function (file) {
    return ipfs.files.add(file);
};

IPFSService.prototype.get = function (hash) {
    return ipfs.files.get(hash);
};

module.exports = IPFSService;