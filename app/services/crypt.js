const openpgp = require('openpgp')

function CryptoService(user) {
    this.user = user;
    openpgp.config.aead_protect = true
}

CryptoService.prototype.generateKeys = function () {
    const options = {
        userIds: [{username: this.user.username, userid: this.user.id}],
        numBits: 1024,
        passphrase: this.user.passphrase
    };
    return openpgp.generateKey(options);
};

CryptoService.prototype.encrypt = function (data) {
    const options = {
        publicKeys: openpgp.key.readArmored(this.user.publicKey).keys,
        data: data
    };
    return openpgp.encrypt(options);
};

CryptoService.prototype.decrypt = function (data) {
    const privKeyObj = openpgp.key.readArmored(this.user.secretKey).keys[0];
    privKeyObj.decrypt(this.user.passphrase);
    const options = {
        message: openpgp.message.read(data),
        privateKey: privKeyObj,
        format: 'binary'
    };
    return openpgp.decrypt(options);
};

module.exports = CryptoService;