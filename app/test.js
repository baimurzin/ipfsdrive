const openpgp = require('openpgp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

openpgp.config.aead_protect = true;
const user = {
    name: "test",
    email: "test@gmail.com"
};

const encryptedFolder = path.join(__dirname, "/../test/encrypted/");
const decryptedFolder = path.join(__dirname, "/../test/decrypted/");

const image = path.join(__dirname, "/../test/file.jpg");
const txt = path.join(__dirname, "/../test/file.txt");

function CryptoService(user) {
    if (!user) {
        throw new Error();
    }
    if (!user.passphrase) {
        user.passphrase = crypto.randomBytes(32).toString('hex');
    }
    this.user = user;
}

CryptoService.prototype.generateKeys = function () {
    const options = {
        userIds: [{name: this.user.name, email: this.user.email}],
        numBits: 1024,
        passphrase: this.user.passphrase
    };
    return openpgp.generateKey(options);
};

CryptoService.prototype.encrypt = function (data) {
    const options = {
        publicKeys: openpgp.key.readArmored(this.user.publicKey).keys,
        data: data,
    };
    return openpgp.encrypt(options);
};

CryptoService.prototype.decrypt = function (data) {
    let privKeyObj = openpgp.key.readArmored(this.user.privateKey).keys[0];
    privKeyObj.decrypt(this.user.passphrase);
    const options = {
        message: openpgp.message.fromBinary(data),
        privateKey: privKeyObj,
        format: 'binary'
    };
    return openpgp.decrypt(options);
};

console.time('test');
const service = new CryptoService(user);
service.generateKeys().then(function (key) {
    user.privateKey = key.privateKeyArmored;
    user.publicKey = key.publicKeyArmored;
    const readFile = fs.readFileSync(image);
    service.encrypt(readFile).then(function (cipherText) {
        fs.writeFileSync(encryptedFolder + "1.jpg", cipherText.data);
        const encryptedFile = fs.readFileSync(encryptedFolder + "1.jpg");
        service.decrypt(encryptedFile).then(function (binary) {
            fs.writeFileSync(decryptedFolder + "1.jpg", binary.data)
            console.timeEnd("test")
        })
    })
});

//Error: Error decrypting message: Invalid session key for decryption.

